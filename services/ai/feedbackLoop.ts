import { getMongoDb } from '../../utils/mongoClient';

export interface TenantAIWeights {
  tenantId: string;
  skillMatch: number;
  experienceDepth: number;
  evidenceLevel: number;
  cultureSignals: number;
  version: number;
  trainedOn: number;
  calibratedAt: Date;
}

interface DecisionRecord {
  tenantId: string;
  decisionType: string;
  resourceId: string;
  outcome: string;
  metadata: Record<string, unknown>;
  recordedAt: Date;
}

const DECISIONS_COLLECTION = 'ai_decisions';
const WEIGHTS_COLLECTION = 'tenant_ai_weights';
const MIN_DECISIONS_FOR_CALIBRATION = 50;

export class FeedbackLoop {
  static async recordDecision(
    tenantId: string,
    decisionType: string,
    resourceId: string,
    outcome: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const db = getMongoDb();
    if (!db) return;

    const record: DecisionRecord = {
      tenantId,
      decisionType,
      resourceId,
      outcome,
      metadata,
      recordedAt: new Date(),
    };
    await db.collection(DECISIONS_COLLECTION).insertOne(record);
    await FeedbackLoop.maybeCalibrateWeights(tenantId);
  }

  static async getWeights(tenantId: string): Promise<TenantAIWeights> {
    const db = getMongoDb();
    if (db) {
      const weights = await db.collection(WEIGHTS_COLLECTION).findOne({ tenantId });
      if (weights) return weights as unknown as TenantAIWeights;
    }
    // Default weights
    return {
      tenantId,
      skillMatch: 0.4,
      experienceDepth: 0.3,
      evidenceLevel: 0.2,
      cultureSignals: 0.1,
      version: 0,
      trainedOn: 0,
      calibratedAt: new Date(0),
    };
  }

  private static async maybeCalibrateWeights(tenantId: string): Promise<void> {
    const db = getMongoDb();
    if (!db) return;

    const count = await db.collection(DECISIONS_COLLECTION).countDocuments({ tenantId });
    const current = await FeedbackLoop.getWeights(tenantId);

    // Only recalibrate every 50 new decisions after initial threshold
    if (count < MIN_DECISIONS_FOR_CALIBRATION) return;
    if (count - current.trainedOn < MIN_DECISIONS_FOR_CALIBRATION) return;

    // Pull recent shortlist/hire outcomes to adjust weights
    const decisions = await db.collection(DECISIONS_COLLECTION)
      .find({ tenantId, decisionType: { $in: ['shortlist', 'hire', 'offer_outcome'] } })
      .sort({ recordedAt: -1 })
      .limit(200)
      .toArray();

    if (decisions.length < MIN_DECISIONS_FOR_CALIBRATION) return;

    // Simple heuristic: if most hires had high skill match scores, boost skillMatch weight
    const hires = decisions.filter(d => d.outcome === 'hired' || d.outcome === 'accepted');
    const hiresWithHighSkill = hires.filter(d => (d.metadata?.skillMatchScore as number) > 0.75);
    const skillBoost = hires.length > 0 ? hiresWithHighSkill.length / hires.length : 0.5;

    const newWeights: TenantAIWeights = {
      tenantId,
      skillMatch: Math.min(0.6, Math.max(0.2, 0.4 * skillBoost + 0.1)),
      experienceDepth: 0.3,
      evidenceLevel: 0.2,
      cultureSignals: 0.1,
      version: current.version + 1,
      trainedOn: count,
      calibratedAt: new Date(),
    };

    // Normalize weights to sum to 1
    const total = newWeights.skillMatch + newWeights.experienceDepth + newWeights.evidenceLevel + newWeights.cultureSignals;
    newWeights.skillMatch = Math.round((newWeights.skillMatch / total) * 100) / 100;
    newWeights.experienceDepth = Math.round((newWeights.experienceDepth / total) * 100) / 100;
    newWeights.evidenceLevel = Math.round((newWeights.evidenceLevel / total) * 100) / 100;
    newWeights.cultureSignals = Math.round((1 - newWeights.skillMatch - newWeights.experienceDepth - newWeights.evidenceLevel) * 100) / 100;

    await db.collection(WEIGHTS_COLLECTION).updateOne(
      { tenantId },
      { $set: newWeights },
      { upsert: true }
    );

    console.log(`[FeedbackLoop] Recalibrated weights for tenant ${tenantId}, version ${newWeights.version}, trained on ${count} decisions`);
  }
}
