import { getMongoDb } from '../utils/mongoClient';
import { logger } from '../utils/logger';

export interface BatchJob {
    batchId: string;
    tenantId: string;
    userId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    results: any[];
    createdAt: Date;
    updatedAt: Date;
}

const BATCH_COLLECTION = 'assessment_batches';

/**
 * Service to manage lifecycle of asynchronous batch recruitment jobs.
 */
export class BatchService {
    static async createBatch(data: Omit<BatchJob, 'createdAt' | 'updatedAt' | 'results' | 'completedJobs' | 'failedJobs'>): Promise<void> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const batch: BatchJob = {
            ...data,
            completedJobs: 0,
            failedJobs: 0,
            results: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection(BATCH_COLLECTION).insertOne(batch);
        logger.info('Created assessment batch in DB', { batchId: data.batchId });
    }

    static async updateJobProgress(batchId: string, result: any, isSuccess: boolean): Promise<void> {
        const db = getMongoDb();
        if (!db) return;

        const update = isSuccess
            ? { $inc: { completedJobs: 1 }, $push: { results: result } }
            : { $inc: { failedJobs: 1 } };

        await db.collection(BATCH_COLLECTION).updateOne(
            { batchId },
            {
                ...update,
                $set: { updatedAt: new Date() }
            }
        );

        // Check if finished
        const batch = await db.collection<BatchJob>(BATCH_COLLECTION).findOne({ batchId });
        if (batch && (batch.completedJobs + batch.failedJobs >= batch.totalJobs)) {
            await db.collection(BATCH_COLLECTION).updateOne(
                { batchId },
                { $set: { status: 'COMPLETED', updatedAt: new Date() } }
            );
            logger.info('Batch process marked as COMPLETED', { batchId });
        }
    }

    static async getBatchStatus(batchId: string, tenantId: string): Promise<BatchJob | null> {
        const db = getMongoDb();
        if (!db) return null;
        return db.collection<BatchJob>(BATCH_COLLECTION).findOne({ batchId, tenantId });
    }
}
