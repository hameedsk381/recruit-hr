import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';
import { JobPosting, JobBoardConnector, JobDescription, JobRequisitionRef } from './jobBoards/types';
import { LinkedInConnector } from './jobBoards/linkedin';
import { IndeedConnector } from './jobBoards/indeed';
import { NaukriConnector } from './jobBoards/naukri';
import { GlassdoorConnector } from './jobBoards/glassdoor';

export type { JobPosting };

const COLLECTION = 'job_postings';

function getConnector(platform: string, credentials: Record<string, string>): JobBoardConnector {
  switch (platform) {
    case 'linkedin':
      return new LinkedInConnector(credentials as any);
    case 'indeed':
      return new IndeedConnector(credentials as any);
    case 'naukri':
      return new NaukriConnector(credentials as any);
    case 'glassdoor':
      return new GlassdoorConnector(credentials as any);
    default:
      throw new Error(`Unsupported job board: ${platform}`);
  }
}

export class JobBoardService {

  static async publish(
    tenantId: string,
    requisitionId: string,
    jd: JobDescription,
    requisition: JobRequisitionRef,
    platform: JobPosting['platform'],
    credentials: Record<string, string>,
    userId: string
  ): Promise<JobPosting> {
    const db = getMongoDb();
    const connector = getConnector(platform, credentials);

    const postingId = await connector.publishJob(jd, requisition);

    const doc: JobPosting = {
      tenantId,
      requisitionId: new ObjectId(requisitionId),
      platform,
      postingId,
      url: `https://${platform}.com/jobs/${postingId}`,
      status: 'active',
      metrics: { views: 0, applications: 0, lastSyncedAt: new Date() },
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    const result = await db.collection(COLLECTION).insertOne(doc);

    await AuditService.getInstance().log({
      tenantId, userId, action: 'JOB_POSTED',
      resource: 'job_posting', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
      details: { platform, postingId },
    });

    return { ...doc, _id: result.insertedId };
  }

  static async unpublish(tenantId: string, id: string, credentials: Record<string, string>, userId: string): Promise<void> {
    const db = getMongoDb();
    const posting = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as JobPosting | null;
    if (!posting) throw new Error('Job posting not found');

    const connector = getConnector(posting.platform, credentials);
    await connector.unpublishJob(posting.postingId);

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'removed' } }
    );

    await AuditService.getInstance().log({
      tenantId, userId, action: 'JOB_UNPUBLISHED',
      resource: 'job_posting', resourceId: id,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });
  }

  static async list(tenantId: string, filters: { platform?: string; status?: string; requisitionId?: string } = {}): Promise<JobPosting[]> {
    const db = getMongoDb();
    const query: Record<string, any> = { tenantId };
    if (filters.platform) query.platform = filters.platform;
    if (filters.status) query.status = filters.status;
    if (filters.requisitionId) query.requisitionId = new ObjectId(filters.requisitionId);
    return db.collection(COLLECTION).find(query).sort({ publishedAt: -1 }).toArray() as Promise<JobPosting[]>;
  }

  static async getMetrics(tenantId: string, id: string): Promise<JobPosting | null> {
    const db = getMongoDb();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<JobPosting | null>;
  }

  static async syncApplications(tenantId: string, id: string, credentials: Record<string, string>): Promise<number> {
    const db = getMongoDb();
    const posting = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as JobPosting | null;
    if (!posting) throw new Error('Job posting not found');

    const connector = getConnector(posting.platform, credentials);
    const applications = await connector.getApplications(posting.postingId, posting.metrics.lastSyncedAt);

    // Upsert inbound applications into talent pool
    for (const app of applications) {
      await db.collection('talent_profiles').updateOne(
        { tenantId, 'candidate.email': app.candidateEmail },
        {
          $setOnInsert: {
            tenantId,
            source: 'applied',
            sourceDetail: `${app.platform}_${posting.postingId}`,
            candidate: { name: app.candidateName, email: app.candidateEmail },
            tags: [],
            notes: [],
            pipeline: { currentStage: 'applied', requisitionId: posting.requisitionId, lastActivity: new Date() },
            nurture: { enrolled: false },
            gdprConsent: { given: false, date: new Date(), channel: 'job_board' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    await db.collection(COLLECTION).updateOne(
      { _id: posting._id },
      {
        $inc: { 'metrics.applications': applications.length },
        $set: { 'metrics.lastSyncedAt': new Date() },
      }
    );

    return applications.length;
  }
}
