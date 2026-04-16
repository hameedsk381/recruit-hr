import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';

export type BGVCheckType = 'identity' | 'employment' | 'education' | 'criminal' | 'credit' | 'address';
export type BGVProvider = 'authbridge' | 'checkr' | 'idfy' | 'sterling';

export interface BGVRequest {
  _id?: ObjectId;
  tenantId: string;
  candidateId: ObjectId;
  offerId: ObjectId;
  provider: BGVProvider;
  checks: BGVCheckType[];
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  providerReferenceId: string;
  result?: {
    overall: 'clear' | 'consider' | 'suspended';
    checkResults: { check: BGVCheckType; status: string; notes?: string }[];
    completedAt: Date;
    reportUrl?: string;
  };
  autoDecision?: 'proceed' | 'hold' | 'reject';
  recruiterOverride?: { decision: string; reason: string; by: string; at: Date };
  createdAt: Date;
}

interface BGVProviderInterface {
  initiateCheck(candidateId: string, checks: BGVCheckType[], metadata?: Record<string, any>): Promise<string>;
  getStatus(referenceId: string): Promise<{ status: string; result?: any }>;
  parseWebhook(payload: unknown): { referenceId: string; status: string; result?: any };
}

// --- Pluggable provider stubs ---

class AuthBridgeProvider implements BGVProviderInterface {
  async initiateCheck(candidateId: string, checks: BGVCheckType[]): Promise<string> {
    // TODO: Integrate AuthBridge API
    console.log(`[BGV:AuthBridge] Initiating checks ${checks.join(',')} for ${candidateId}`);
    return `AB_${Date.now()}_${candidateId}`;
  }
  async getStatus(referenceId: string) {
    return { status: 'in_progress' };
  }
  parseWebhook(payload: any) {
    return { referenceId: payload.reference_id, status: payload.status, result: payload.result };
  }
}

class CheckrProvider implements BGVProviderInterface {
  async initiateCheck(candidateId: string, checks: BGVCheckType[]): Promise<string> {
    console.log(`[BGV:Checkr] Initiating checks ${checks.join(',')} for ${candidateId}`);
    return `CHK_${Date.now()}_${candidateId}`;
  }
  async getStatus(referenceId: string) {
    return { status: 'in_progress' };
  }
  parseWebhook(payload: any) {
    return { referenceId: payload.id, status: payload.status, result: payload };
  }
}

const PROVIDERS: Record<BGVProvider, BGVProviderInterface> = {
  authbridge: new AuthBridgeProvider(),
  checkr: new CheckrProvider(),
  idfy: new AuthBridgeProvider(),    // same interface, different impl when integrated
  sterling: new CheckrProvider(),    // same interface, different impl when integrated
};

const COLLECTION = 'bgv_requests';

export class BGVService {

  static async initiate(tenantId: string, params: {
    candidateId: string;
    offerId: string;
    provider: BGVProvider;
    checks: BGVCheckType[];
  }, userId: string): Promise<BGVRequest> {
    const db = getMongoDb();
    const provider = PROVIDERS[params.provider];

    const referenceId = await provider.initiateCheck(params.candidateId, params.checks);

    const doc: BGVRequest = {
      tenantId,
      candidateId: new ObjectId(params.candidateId),
      offerId: new ObjectId(params.offerId),
      provider: params.provider,
      checks: params.checks,
      status: 'initiated',
      providerReferenceId: referenceId,
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);
    const created = { ...doc, _id: result.insertedId };

    await AuditService.getInstance().log({
      tenantId, userId, action: 'BGV_INITIATED',
      resource: 'bgv', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { provider: params.provider, checks: params.checks },
    });

    return created;
  }

  static async getById(tenantId: string, id: string): Promise<BGVRequest | null> {
    const db = getMongoDb();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<BGVRequest | null>;
  }

  static async handleWebhook(payload: unknown, providerHint?: BGVProvider): Promise<void> {
    const db = getMongoDb();

    // Try to detect provider from payload structure, or use hint
    let parsed: { referenceId: string; status: string; result?: any } | null = null;

    if (providerHint && PROVIDERS[providerHint]) {
      parsed = PROVIDERS[providerHint].parseWebhook(payload);
    } else {
      // Try each provider
      for (const provider of Object.values(PROVIDERS)) {
        try {
          parsed = provider.parseWebhook(payload);
          if (parsed.referenceId) break;
        } catch { /* try next */ }
      }
    }

    if (!parsed?.referenceId) {
      console.error('[BGV] Could not parse webhook payload');
      return;
    }

    const record = await db.collection(COLLECTION).findOne({ providerReferenceId: parsed.referenceId });
    if (!record) return;

    const newStatus = parsed.status === 'complete' || parsed.status === 'completed' ? 'completed' :
                     parsed.status === 'failed' ? 'failed' : 'in_progress';

    let autoDecision: 'proceed' | 'hold' | 'reject' | undefined;
    if (newStatus === 'completed' && parsed.result) {
      const overall = parsed.result?.overall || parsed.result?.adjudication;
      if (overall === 'clear') autoDecision = 'proceed';
      else if (overall === 'consider') autoDecision = 'hold';
      else autoDecision = 'reject';
    }

    await db.collection(COLLECTION).updateOne(
      { _id: record._id },
      {
        $set: {
          status: newStatus,
          ...(parsed.result ? { result: { ...parsed.result, completedAt: new Date() } } : {}),
          ...(autoDecision ? { autoDecision } : {}),
        }
      }
    );

    await AuditService.getInstance().log({
      tenantId: record.tenantId, action: 'BGV_WEBHOOK_RECEIVED',
      resource: 'bgv', resourceId: record._id.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { newStatus, autoDecision },
    });
  }

  static async decide(tenantId: string, id: string, decision: string, reason: string, userId: string): Promise<BGVRequest | null> {
    const db = getMongoDb();
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: { recruiterOverride: { decision, reason, by: userId, at: new Date() } } }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'BGV_DECISION',
      resource: 'bgv', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { decision, reason },
    });

    return this.getById(tenantId, id);
  }
}
