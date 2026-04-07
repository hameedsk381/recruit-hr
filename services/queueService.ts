import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { matchJobWithResume } from './jobMatcher';
import { extractResumeData } from './resumeExtractor';
import { createLogger } from '../utils/logger';
import { BatchService } from './batchService';
import { Buffer } from 'buffer';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null
});

export const assessmentQueue = new Queue('candidate-assessment', { connection });

export interface AssessmentJobData {
    jdData: any;
    resumeBuffer: Buffer;
    resumeName: string;
    tenantId: string;
    userId: string;
    batchId?: string; // Optional batch context
}

export const assessmentWorker = new Worker(
    'candidate-assessment',
    async (job: Job<AssessmentJobData>) => {
        const { jdData, resumeBuffer, resumeName, tenantId, userId, batchId } = job.data;
        const logger = createLogger(job.id, 'AssessmentWorker', tenantId, userId);

        try {
            const buffer = Buffer.from((resumeBuffer as any).data || resumeBuffer);
            const rawResumeData = await extractResumeData(buffer);
            const matchResult = await matchJobWithResume(jdData, rawResumeData);

            const result = {
                resumeName,
                matchResult,
                status: 'COMPLETED'
            };

            // If part of a batch, update DB progress
            if (batchId) {
                await BatchService.updateJobProgress(batchId, result, true);
            }

            return result;
        } catch (error) {
            logger.error(`Assessment failed for ${resumeName}`, error as Error);
            if (batchId) {
                await BatchService.updateJobProgress(batchId, null, false);
            }
            throw error;
        }
    },
    { connection, concurrency: 5 }
);
