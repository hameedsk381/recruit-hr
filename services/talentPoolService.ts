import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';

export interface RecruiterNote {
  text: string;
  addedBy: string;
  addedAt: Date;
}

export interface TalentProfile {
  _id?: ObjectId;
  tenantId: string;
  source: 'applied' | 'sourced' | 'referred' | 'imported' | 'rehire';
  sourceDetail: string;
  candidate: {
    name: string;
    email: string;
    phone?: string;
    linkedin?: string;
    skills?: string[];
    experienceYears?: number;
    currentRole?: string;
    currentCompany?: string;
    location?: string;
  };
  tags: string[];
  notes: RecruiterNote[];
  pipeline: {
    currentStage: string;
    requisitionId?: ObjectId;
    lastActivity: Date;
  };
  nurture: {
    enrolled: boolean;
    sequenceId?: string;
    lastContactAt?: Date;
    nextContactAt?: Date;
    responseRate?: number;
  };
  gdprConsent: { given: boolean; date: Date; channel: string };
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'talent_profiles';

export class TalentPoolService {

  static async add(tenantId: string, data: Omit<TalentProfile, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>, userId: string): Promise<TalentProfile> {
    const db = getMongoDb();
    const now = new Date();
    const doc: TalentProfile = { ...data, tenantId, createdAt: now, updatedAt: now };

    const result = await db.collection(COLLECTION).insertOne(doc);

    await AuditService.getInstance().log({
      tenantId, userId, action: 'TALENT_POOL_ADD',
      resource: 'talent_profile', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return { ...doc, _id: result.insertedId };
  }

  static async search(
    tenantId: string,
    query: {
      text?: string;
      tags?: string[];
      stage?: string;
      source?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ profiles: TalentProfile[]; total: number }> {
    const db = getMongoDb();
    const filter: Record<string, any> = { tenantId };

    if (query.text) {
      filter.$or = [
        { 'candidate.name': { $regex: query.text, $options: 'i' } },
        { 'candidate.email': { $regex: query.text, $options: 'i' } },
        { 'candidate.skills': { $regex: query.text, $options: 'i' } },
        { 'candidate.currentRole': { $regex: query.text, $options: 'i' } },
        { 'candidate.currentCompany': { $regex: query.text, $options: 'i' } },
      ];
    }
    if (query.tags?.length) filter.tags = { $all: query.tags };
    if (query.stage) filter['pipeline.currentStage'] = query.stage;
    if (query.source) filter.source = query.source;

    const limit = query.limit ?? 20;
    const skip = query.offset ?? 0;

    const [profiles, total] = await Promise.all([
      db.collection(COLLECTION).find(filter).skip(skip).limit(limit).sort({ 'pipeline.lastActivity': -1 }).toArray(),
      db.collection(COLLECTION).countDocuments(filter),
    ]);

    return { profiles: profiles as TalentProfile[], total };
  }

  static async getById(tenantId: string, id: string): Promise<TalentProfile | null> {
    const db = getMongoDb();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<TalentProfile | null>;
  }

  static async update(tenantId: string, id: string, data: Partial<TalentProfile>, userId: string): Promise<TalentProfile | null> {
    const db = getMongoDb();
    const update = { ...data, updatedAt: new Date() };
    delete update._id;
    delete (update as any).tenantId;

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      { $set: update }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'TALENT_POOL_UPDATE',
      resource: 'talent_profile', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return this.getById(tenantId, id);
  }

  static async addNote(tenantId: string, id: string, text: string, userId: string): Promise<TalentProfile | null> {
    const db = getMongoDb();
    const note: RecruiterNote = { text, addedBy: userId, addedAt: new Date() };

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      {
        $push: { notes: note } as any,
        $set: { updatedAt: new Date(), 'pipeline.lastActivity': new Date() },
      }
    );

    return this.getById(tenantId, id);
  }

  static async enrollNurture(tenantId: string, id: string, sequenceId: string, userId: string): Promise<TalentProfile | null> {
    const db = getMongoDb();
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), tenantId },
      {
        $set: {
          'nurture.enrolled': true,
          'nurture.sequenceId': sequenceId,
          updatedAt: new Date(),
        },
      }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'TALENT_NURTURE_ENROLLED',
      resource: 'talent_profile', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { sequenceId },
    });

    return this.getById(tenantId, id);
  }

  static async bulkImport(
    tenantId: string,
    profiles: Array<Omit<TalentProfile, '_id' | 'tenantId' | 'createdAt' | 'updatedAt'>>,
    userId: string
  ): Promise<{ inserted: number; skipped: number }> {
    const db = getMongoDb();
    const now = new Date();
    let inserted = 0;
    let skipped = 0;

    for (const profile of profiles) {
      const existing = await db.collection(COLLECTION).findOne({
        tenantId,
        'candidate.email': profile.candidate.email,
      });

      if (existing) { skipped++; continue; }

      await db.collection(COLLECTION).insertOne({ ...profile, tenantId, createdAt: now, updatedAt: now });
      inserted++;
    }

    await AuditService.getInstance().log({
      tenantId, userId, action: 'TALENT_POOL_BULK_IMPORT',
      resource: 'talent_profile',
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { inserted, skipped, total: profiles.length },
    });

    return { inserted, skipped };
  }
}
