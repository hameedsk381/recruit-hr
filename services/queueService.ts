import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { matchJobWithResume } from './jobMatcher';
import { extractResumeData } from './resumeExtractor';
import { JobDescriptionData } from './jdExtractor';
import { createLogger } from '../utils/logger';
import { BatchService } from './batchService';
import { Buffer } from 'buffer';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const createRedisConnection = () => {
    const conn = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        connectTimeout: 5000
    });
    conn.on('error', (err: Error) => {
        console.warn('[QueueService] Redis connection warning:', err.message);
    });
    return conn as any;
};

export const assessmentQueue = new Queue('candidate-assessment', { connection: createRedisConnection() });

export interface AssessmentJobData {
    jdData: JobDescriptionData;
    resumeBuffer: Buffer | { type: 'Buffer'; data: number[] } | string;
    resumeName: string;
    tenantId: string;
    userId: string;
    batchId?: string; // Optional batch context
}

export const assessmentWorker = new Worker(
    'candidate-assessment',
    async (job: Job<AssessmentJobData>) => {
        const { jdData, resumeBuffer, resumeName, tenantId, userId, batchId } = job.data;
        const logger = createLogger(job.id || 'unknown-job', 'AssessmentWorker', tenantId, userId);
        try {
            if (batchId) {
                const isCancelled = await BatchService.isBatchCancelled(batchId, tenantId);
                if (isCancelled) {
                    logger.info(`Skipping job ${job.id} as batch ${batchId} was cancelled.`);
                    return { resumeName, status: 'CANCELLED' };
                }
            }

            // Support buffer payloads or optimized string base64 payloads to save Redis memory ceiling
            let bufferData;
            if (typeof resumeBuffer === 'string') {
                bufferData = Buffer.from(resumeBuffer, 'base64');
            } else {
                bufferData = typeof resumeBuffer === 'object' && resumeBuffer !== null && 'data' in resumeBuffer 
                    ? resumeBuffer.data 
                    : resumeBuffer;
            }
            
            const buffer = Buffer.isBuffer(bufferData) ? bufferData : Buffer.from(bufferData as number[]);
            const rawResumeData = await extractResumeData(buffer, tenantId);
            const matchResult = await matchJobWithResume(jdData, rawResumeData);

            const result = {
                resumeName,
                matchResult,
                status: 'COMPLETED'
            };

            // If part of a batch, update DB progress
            if (batchId) {
                await BatchService.updateJobProgress(batchId, tenantId, result, true);
            }

            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error(`Assessment failed for ${resumeName}`, err);
            if (batchId) {
                await BatchService.updateJobProgress(batchId, tenantId, null, false);
            }
            throw err;
        }
    },
    { connection: createRedisConnection(), concurrency: parseInt(process.env.MATCH_CONCURRENCY || '5') }
);
