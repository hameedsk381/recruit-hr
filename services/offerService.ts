import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';
import { ApprovalStep } from './requisitionService';

export interface OfferHistoryEntry {
  status: string;
  changedAt: Date;
  changedBy: string;
  note?: string;
}

export interface Offer {
  _id?: ObjectId;
  tenantId: string;
  candidateId: ObjectId;
  jobId: ObjectId;
  requisitionId: ObjectId;
  compensation: {
    base: number;
    currency: string;
    bonus?: number;
    equity?: string;
    signingBonus?: number;
    benefits: string[];
  };
  startDate: Date;
  expiryDate: Date;
  letterTemplate?: string;
  generatedLetterUrl?: string;
  status: 'draft' | 'pending_approval' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
  signingProvider: 'docusign' | 'adobe_sign' | 'manual';
  signingEnvelopeId?: string;
  approvalChain: ApprovalStep[];
  history: OfferHistoryEntry[];
  createdBy: string;
  createdAt: Date;
}

const COLLECTION = 'offers';

export class OfferService {

  static async create(tenantId: string, data: Omit<Offer, '_id' | 'tenantId' | 'status' | 'history' | 'createdAt'>, userId: string): Promise<Offer> {
    const db = getMongoDb();
    const doc: Offer = {
      ...data,
      tenantId,
      status: 'draft',
      history: [{ status: 'draft', changedAt: new Date(), changedBy: userId }],
      createdAt: new Date(),
    };
    const result = await db.collection(COLLECTION).insertOne(doc);
    const created = { ...doc, _id: result.insertedId };

    await AuditService.getInstance().log({
      tenantId, userId, action: 'OFFER_CREATED',
      resource: 'offer', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return created;
  }

  static async getById(tenantId: string, id: string): Promise<Offer | null> {
    const db = getMongoDb();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<Offer | null>;
  }

  static async update(tenantId: string, id: string, data: Partial<Offer>, userId: string): Promise<Offer | null> {
    const db = getMongoDb();
    const update = { ...data };
    delete update._id;
    delete (update as any).tenantId;

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId, status: 'draft' },
      { $set: update }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'OFFER_UPDATED',
      resource: 'offer', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  static async approve(tenantId: string, id: string, approverId: string, decision: 'approved' | 'rejected', comment?: string): Promise<Offer | null> {
    const db = getMongoDb();
    const offer = await this.getById(tenantId, id);
    if (!offer) return null;

    const updatedChain = offer.approvalChain.map(step => {
      if (step.status === 'pending' && (!step.approverId || step.approverId === approverId)) {
        return { ...step, approverId, status: decision, comment, decidedAt: new Date() };
      }
      return step;
    });

    const allApproved = updatedChain.every(s => s.status === 'approved');
    const anyRejected = updatedChain.some(s => s.status === 'rejected');
    const newStatus = anyRejected ? 'draft' : allApproved ? 'draft' : 'pending_approval';

    const historyEntry: OfferHistoryEntry = { status: newStatus, changedAt: new Date(), changedBy: approverId, note: comment };

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      {
        $set: { approvalChain: updatedChain, status: newStatus },
        $push: { history: historyEntry } as any,
      }
    );

    await AuditService.getInstance().log({
      tenantId, userId: approverId, action: `OFFER_${decision.toUpperCase()}`,
      resource: 'offer', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  static async send(tenantId: string, id: string, userId: string, envelopeId?: string): Promise<Offer | null> {
    const db = getMongoDb();
    const historyEntry: OfferHistoryEntry = { status: 'sent', changedAt: new Date(), changedBy: userId };

    const update: Record<string, any> = { status: 'sent' };
    if (envelopeId) update.signingEnvelopeId = envelopeId;

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: update, $push: { history: historyEntry } as any }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'OFFER_SENT',
      resource: 'offer', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  static async withdraw(tenantId: string, id: string, userId: string): Promise<Offer | null> {
    const db = getMongoDb();
    const historyEntry: OfferHistoryEntry = { status: 'withdrawn', changedAt: new Date(), changedBy: userId };

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: { status: 'withdrawn' }, $push: { history: historyEntry } as any }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'OFFER_WITHDRAWN',
      resource: 'offer', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  // Called by e-sign webhook
  static async updateSigningStatus(tenantId: string, envelopeId: string, status: 'accepted' | 'declined'): Promise<void> {
    const db = getMongoDb();
    const historyEntry: OfferHistoryEntry = { status, changedAt: new Date(), changedBy: 'esign_webhook' };

    await db.collection(COLLECTION).updateOne(
      { tenantId, signingEnvelopeId: envelopeId },
      { $set: { status }, $push: { history: historyEntry } as any }
    );
  }

  // Manage offer templates
  static async listTemplates(tenantId: string): Promise<any[]> {
    const db = getMongoDb();
    return db.collection('offer_templates').find({ tenantId }).toArray();
  }

  static async createTemplate(tenantId: string, data: { name: string; htmlTemplate: string; variables: string[]; isDefault?: boolean }, userId: string): Promise<any> {
    const db = getMongoDb();
    const doc = { ...data, tenantId, createdBy: userId, createdAt: new Date() };
    const result = await db.collection('offer_templates').insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }
}
