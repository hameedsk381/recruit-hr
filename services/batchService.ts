import { getMongoDb } from '../utils/mongoClient';
import { logger } from '../utils/logger';

export interface BatchJob {
    batchId: string;
    tenantId: string;
    userId: string;
    jobData?: any; // To store the JD blueprint
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
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

        const tenantBatch = await db.collection<BatchJob>(BATCH_COLLECTION).findOne({ batchId });
        if (!tenantBatch) return;

        if (isSuccess && result) {
            // Enterprise Scaling: Save result to separate collection to avoid 16MB limit
            await db.collection('assessment_results').insertOne({
                batchId,
                tenantId: tenantBatch.tenantId,
                ...result,
                createdAt: new Date()
            });
            await db.collection(BATCH_COLLECTION).updateOne(
                { batchId },
                { 
                    $inc: { completedJobs: 1 },
                    $set: { updatedAt: new Date() }
                }
            );
        } else {
            await db.collection(BATCH_COLLECTION).updateOne(
                { batchId },
                { 
                    $inc: { failedJobs: 1 },
                    $set: { updatedAt: new Date() }
                }
            );
        }

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

    static async getBatchStatus(batchId: string, tenantId: string): Promise<any | null> {
        const db = getMongoDb();
        if (!db) return null;
        
        const batch = await db.collection<BatchJob>(BATCH_COLLECTION).findOne({ batchId, tenantId });
        if (!batch) return null;

        // Fetch results from separate collection
        const results = await db.collection('assessment_results')
            .find({ batchId, tenantId })
            .toArray();

        return { ...batch, results };
    }

    static async cancelBatch(batchId: string, tenantId: string): Promise<boolean> {
        const db = getMongoDb();
        if (!db) return false;

        const result = await db.collection<BatchJob>(BATCH_COLLECTION).updateOne(
            { batchId, tenantId, status: { $in: ['PENDING', 'PROCESSING'] } },
            { $set: { status: 'CANCELLED', updatedAt: new Date() } }
        );

        return result.modifiedCount > 0;
    }

    static async isBatchCancelled(batchId: string): Promise<boolean> {
        const db = getMongoDb();
        if (!db) return false;

        const batch = await db.collection<BatchJob>(BATCH_COLLECTION).findOne({ batchId }, { projection: { status: 1 } });
        return batch?.status === 'CANCELLED';
    }
}
