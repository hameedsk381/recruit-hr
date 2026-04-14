import { Queue, Worker, Job } from 'bullmq';
import { getMongoDb } from '../utils/mongoClient';
import { ObjectId } from 'mongodb';
import { generateRecruiterAssessment } from './recruiterCopilot';
import { convertLegacyToRecruiterInput } from './recruiterCopilot';

const redisConnection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

// 1. Define the Queue
export const BulkEvalQueue = new Queue('ResumeBatchProcess', { connection: redisConnection });

export interface BulkJobPayload {
    batchId: string;
    jobDescriptionId: string;
    candidateData: any; // Raw parsed resume info or ATS webhook payload
    tenantId: string;
}

// 2. Define the Worker (Listens in Background)
export const BulkEvalWorker = new Worker('ResumeBatchProcess', async (job: Job<BulkJobPayload>) => {
    const { batchId, jobDescriptionId, candidateData, tenantId } = job.data;
    const db = getMongoDb();
    
    try {
        console.log(`[BatchWorker] Processing candidate ${candidateData.name} for Batch ${batchId}`);
        
        // 1. Fetch Job Description (Assuming it's stored in 'jobs' collection)
        let jobDescription;
        if (db) {
            jobDescription = await db.collection('jobs').findOne({ _id: new ObjectId(jobDescriptionId) });
        }
        
        if (!jobDescription) {
            throw new Error(`Job Description ${jobDescriptionId} not found`);
        }

        // 2. Map data formats
        const assessmentInput = convertLegacyToRecruiterInput(jobDescription, candidateData);

        // 3. Process via AI Router (this dynamically respects GDPR rules and rate limits!)
        const assessmentResult = await generateRecruiterAssessment(assessmentInput);

        // 4. Update the DB Batch Tracking Map
        if (db) {
            // Log individual candidate result back to ATS/DB
            await db.collection('batch_results').insertOne({
                batchId,
                candidateName: candidateData.name,
                candidateEmail: candidateData.email,
                assessment: assessmentResult,
                processedAt: new Date()
            });

            // Increment the counter on the master tracking ticket
            await db.collection('batch_tickets').updateOne(
                { _id: new ObjectId(batchId) },
                { $inc: { processedCount: 1 } }
            );
        }

        return { success: true, email: candidateData.email };
    } catch (error) {
        console.error(`[BatchWorker] Error processing job ${job.id}:`, error);

        if (db) {
            await db.collection('batch_tickets').updateOne(
                { _id: new ObjectId(batchId) },
                { $inc: { failedCount: 1, processedCount: 1 } } 
            );
        }
        throw error;
    }
}, { 
    connection: redisConnection,
    concurrency: 5 // Run 5 concurrent processes so we don't blow out LiteLLM instantly
});

// Worker Events for debugging
BulkEvalWorker.on('completed', job => {
    console.log(`[BatchWorker] Job ${job.id} completed successfully`);
});
BulkEvalWorker.on('failed', (job, err) => {
    console.log(`[BatchWorker] Job ${job?.id} failed: ${err.message}`);
});
