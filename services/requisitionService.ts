import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';

export interface ApprovalStep {
  approverRole: string;
  approverId?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  decidedAt?: Date;
}

export interface JobRequisition {
  _id?: ObjectId;
  tenantId: string;
  title: string;
  department: string;
  location: string;
  headcount: number;
  budgetBand: { min: number; max: number; currency: string };
  justification: string;
  linkedJD?: ObjectId;
  approvalChain: ApprovalStep[];
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'closed' | 'frozen';
  hiringManagerId: string;
  recruiterId?: string;
  targetHireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'requisitions';

export class RequisitionService {

  static async create(tenantId: string, data: Omit<JobRequisition, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>, userId: string): Promise<JobRequisition> {
    const db = getMongoDb();
    const now = new Date();
    const doc: JobRequisition = {
      ...data,
      tenantId,
      status: 'draft',
      approvalChain: data.approvalChain || [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection(COLLECTION).insertOne(doc);
    const created = { ...doc, _id: result.insertedId };

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REQUISITION_CREATED',
      resource: 'requisition', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return created;
  }

  static async list(tenantId: string, filters: { status?: string; department?: string } = {}): Promise<JobRequisition[]> {
    const db = getMongoDb();
    const query: Record<string, any> = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.department) query.department = filters.department;
    return db.collection(COLLECTION).find(query).sort({ createdAt: -1 }).toArray() as Promise<JobRequisition[]>;
  }

  static async getById(tenantId: string, id: string): Promise<JobRequisition | null> {
    const db = getMongoDb();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<JobRequisition | null>;
  }

  static async update(tenantId: string, id: string, data: Partial<JobRequisition>, userId: string): Promise<JobRequisition | null> {
    const db = getMongoDb();
    const update = { ...data, updatedAt: new Date() };
    delete update._id;
    delete (update as any).tenantId;

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: update }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REQUISITION_UPDATED',
      resource: 'requisition', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  static async approve(tenantId: string, id: string, approverId: string, decision: 'approved' | 'rejected', comment?: string): Promise<JobRequisition | null> {
    const db = getMongoDb();
    const req = await this.getById(tenantId, id);
    if (!req) return null;

    // Find the pending step for this approver
    const updatedChain = req.approvalChain.map(step => {
      if (step.status === 'pending' && (!step.approverId || step.approverId === approverId)) {
        return { ...step, approverId, status: decision, comment, decidedAt: new Date() };
      }
      return step;
    });

    const allApproved = updatedChain.every(s => s.status === 'approved');
    const anyRejected = updatedChain.some(s => s.status === 'rejected');
    const newStatus = anyRejected ? 'draft' : allApproved ? 'approved' : 'pending_approval';

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: { approvalChain: updatedChain, status: newStatus, updatedAt: new Date() } }
    );

    await AuditService.getInstance().log({
      tenantId, userId: approverId, action: `REQUISITION_${decision.toUpperCase()}`,
      resource: 'requisition', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { comment },
    });

    return this.getById(tenantId, id);
  }

  static async publish(tenantId: string, id: string, userId: string): Promise<JobRequisition | null> {
    const db = getMongoDb();
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId, status: 'approved' },
      { $set: { status: 'published', updatedAt: new Date() } }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REQUISITION_PUBLISHED',
      resource: 'requisition', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  static async close(tenantId: string, id: string, userId: string): Promise<void> {
    const db = getMongoDb();
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: { status: 'closed', updatedAt: new Date() } }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'REQUISITION_CLOSED',
      resource: 'requisition', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });
  }
}
