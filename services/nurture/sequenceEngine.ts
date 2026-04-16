import { getMongoDb } from '../../utils/mongoClient';
import { AuditService } from '../auditService';
import { ObjectId } from 'mongodb';

export interface NurtureStep {
  order: number;
  delayDays: number;
  channel: 'email' | 'sms' | 'whatsapp';
  templateId: string;
  condition?: string; // e.g., "skip_if_opened_previous"
}

export interface NurtureSequence {
  _id?: ObjectId;
  tenantId: string;
  name: string;
  triggerEvent: 'added_to_pool' | 'job_match_found' | 'manual';
  steps: NurtureStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NurtureEnrollment {
  _id?: ObjectId;
  tenantId: string;
  profileId: ObjectId;
  sequenceId: ObjectId;
  currentStep: number;
  status: 'active' | 'paused' | 'completed' | 'unsubscribed';
  nextFireAt: Date;
  completedSteps: number[];
  startedAt: Date;
  updatedAt: Date;
}

const SEQ_COLLECTION = 'nurture_sequences';
const ENROLL_COLLECTION = 'nurture_enrollments';

export class SequenceEngine {

  static async createSequence(tenantId: string, data: Omit<NurtureSequence, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<NurtureSequence> {
    const db = getMongoDb();
    const now = new Date();
    const doc: NurtureSequence = { ...data, tenantId, createdAt: now, updatedAt: now };
    const result = await db.collection(SEQ_COLLECTION).insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async listSequences(tenantId: string): Promise<NurtureSequence[]> {
    const db = getMongoDb();
    return db.collection(SEQ_COLLECTION).find({ tenantId }).toArray() as Promise<NurtureSequence[]>;
  }

  static async enroll(tenantId: string, profileId: string, sequenceId: string): Promise<NurtureEnrollment> {
    const db = getMongoDb();
    const sequence = await db.collection(SEQ_COLLECTION).findOne({ _id: new ObjectId(sequenceId), tenantId }) as NurtureSequence | null;
    if (!sequence) throw new Error('Nurture sequence not found');

    const firstStep = sequence.steps.sort((a, b) => a.order - b.order)[0];
    const nextFireAt = new Date(Date.now() + (firstStep?.delayDays ?? 1) * 24 * 60 * 60 * 1000);

    const doc: NurtureEnrollment = {
      tenantId,
      profileId: new ObjectId(profileId),
      sequenceId: new ObjectId(sequenceId),
      currentStep: 0,
      status: 'active',
      nextFireAt,
      completedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(ENROLL_COLLECTION).insertOne(doc);

    // Update talent profile
    await db.collection('talent_profiles').updateOne(
      { _id: new ObjectId(profileId), tenantId },
      { $set: { 'nurture.enrolled': true, 'nurture.sequenceId': sequenceId, 'nurture.nextContactAt': nextFireAt, updatedAt: new Date() } }
    );

    return { ...doc, _id: result.insertedId };
  }

  /**
   * Process due nurture steps — called by a background job / cron
   */
  static async processDueSteps(): Promise<void> {
    const db = getMongoDb();
    const now = new Date();

    const due = await db.collection(ENROLL_COLLECTION)
      .find({ status: 'active', nextFireAt: { $lte: now } })
      .limit(100)
      .toArray() as NurtureEnrollment[];

    for (const enrollment of due) {
      try {
        const sequence = await db.collection(SEQ_COLLECTION).findOne({ _id: enrollment.sequenceId }) as NurtureSequence | null;
        if (!sequence) continue;

        const sortedSteps = sequence.steps.sort((a, b) => a.order - b.order);
        const step = sortedSteps[enrollment.currentStep];
        if (!step) {
          // Sequence complete
          await db.collection(ENROLL_COLLECTION).updateOne(
            { _id: enrollment._id },
            { $set: { status: 'completed', updatedAt: new Date() } }
          );
          continue;
        }

        // Dispatch message via outreach service
        await SequenceEngine.dispatchStep(enrollment, step);

        const nextStepIndex = enrollment.currentStep + 1;
        const nextStep = sortedSteps[nextStepIndex];

        if (!nextStep) {
          await db.collection(ENROLL_COLLECTION).updateOne(
            { _id: enrollment._id },
            {
              $set: { status: 'completed', updatedAt: new Date() },
              $push: { completedSteps: step.order } as any,
            }
          );
        } else {
          const nextFireAt = new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000);
          await db.collection(ENROLL_COLLECTION).updateOne(
            { _id: enrollment._id },
            {
              $set: { currentStep: nextStepIndex, nextFireAt, updatedAt: new Date() },
              $push: { completedSteps: step.order } as any,
            }
          );

          // Update profile next contact
          await db.collection('talent_profiles').updateOne(
            { _id: enrollment.profileId },
            { $set: { 'nurture.nextContactAt': nextFireAt, 'nurture.lastContactAt': now } }
          );
        }
      } catch (err) {
        console.error(`[NurtureEngine] Failed to process enrollment ${enrollment._id}:`, err);
      }
    }
  }

  private static async dispatchStep(enrollment: NurtureEnrollment, step: NurtureStep): Promise<void> {
    const db = getMongoDb();
    const profile = await db.collection('talent_profiles').findOne({ _id: enrollment.profileId });
    if (!profile) return;

    console.log(`[NurtureEngine] Dispatching step ${step.order} via ${step.channel} to ${profile.candidate?.email}`);

    await AuditService.getInstance().log({
      tenantId: enrollment.tenantId, action: 'NURTURE_STEP_SENT',
      resource: 'nurture_enrollment', resourceId: enrollment._id?.toString() || '',
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { channel: step.channel, templateId: step.templateId, step: step.order },
    });
  }
}
