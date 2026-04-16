import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';

export interface Referral {
  _id?: ObjectId;
  tenantId: string;
  referrerId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  requisitionId?: ObjectId;
  status: 'submitted' | 'reviewing' | 'shortlisted' | 'hired' | 'rejected';
  bonus?: { amount: number; currency: string; paidAt?: Date };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'referrals';

export class ReferralService {

  static async submit(tenantId: string, data: {
    referrerId: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone?: string;
    requisitionId?: string;
    notes?: string;
  }, userId: string): Promise<Referral> {
    const db = getMongoDb();
    const now = new Date();

    const doc: Referral = {
      tenantId,
      referrerId: data.referrerId,
      candidateName: data.candidateName,
      candidateEmail: data.candidateEmail,
      candidatePhone: data.candidatePhone,
      requisitionId: data.requisitionId ? new ObjectId(data.requisitionId) : undefined,
      status: 'submitted',
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTION).insertOne(doc);

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REFERRAL_SUBMITTED',
      resource: 'referral', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    // Auto-add to talent pool
    await db.collection('talent_profiles').updateOne(
      { tenantId, 'candidate.email': data.candidateEmail },
      {
        $setOnInsert: {
          tenantId,
          source: 'referred',
          sourceDetail: `referral:${data.referrerId}`,
          candidate: { name: data.candidateName, email: data.candidateEmail, phone: data.candidatePhone },
          tags: ['referred'],
          notes: [],
          pipeline: {
            currentStage: 'applied',
            requisitionId: data.requisitionId ? new ObjectId(data.requisitionId) : undefined,
            lastActivity: new Date(),
          },
          nurture: { enrolled: false },
          gdprConsent: { given: false, date: new Date(), channel: 'referral' },
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    return { ...doc, _id: result.insertedId };
  }

  static async list(tenantId: string, filters: { status?: string; referrerId?: string } = {}): Promise<Referral[]> {
    const db = getMongoDb();
    const query: Record<string, any> = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.referrerId) query.referrerId = filters.referrerId;
    return db.collection(COLLECTION).find(query).sort({ createdAt: -1 }).toArray() as Promise<Referral[]>;
  }

  static async updateStatus(tenantId: string, id: string, status: Referral['status'], userId: string): Promise<Referral | null> {
    const db = getMongoDb();
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: { status, updatedAt: new Date() } }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REFERRAL_STATUS_UPDATED',
      resource: 'referral', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { status },
    });

    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<Referral | null>;
  }

  static async recordBonus(tenantId: string, id: string, bonus: { amount: number; currency: string }, userId: string): Promise<void> {
    const db = getMongoDb();
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: { bonus: { ...bonus, paidAt: new Date() }, updatedAt: new Date() } }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REFERRAL_BONUS_PAID',
      resource: 'referral', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: bonus,
    });
  }
}
