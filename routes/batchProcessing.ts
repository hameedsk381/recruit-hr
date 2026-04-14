import { BulkEvalQueue } from '../services/batchProcessingService';
import { getMongoDb } from '../utils/mongoClient';
import { ObjectId } from 'mongodb';

export async function bulkProcessUploadHandler(req: Request, context: any): Promise<Response> {
    try {
        const body = await req.json();
        const { jobDescriptionId, candidates } = body;

        if (!jobDescriptionId || !Array.isArray(candidates) || candidates.length === 0) {
            return new Response(JSON.stringify({ success: false, error: "Invalid payload. Require jobDescriptionId and candidates array." }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) {
            return new Response(JSON.stringify({ success: false, error: "Database unavailable" }), { status: 503 });
        }

        // 1. Create a Master Tracking Ticket
        const batchTicket = await db.collection('batch_tickets').insertOne({
            tenantId: context.tenantId,
            jobDescriptionId: jobDescriptionId,
            totalCount: candidates.length,
            processedCount: 0,
            failedCount: 0,
            status: 'QUEUED',
            createdAt: new Date()
        });

        const batchId = batchTicket.insertedId.toString();

        // 2. Map Payload to BullMQ Batch
        const jobsToQueue = candidates.map((candidate, index) => ({
            name: `eval-${batchId}-${index}`, // Job name
            data: {
                batchId,
                jobDescriptionId,
                candidateData: candidate,
                tenantId: context.tenantId
            }
        }));

        // 3. Bulk push to Redis Queue
        await BulkEvalQueue.addBulk(jobsToQueue);

        return new Response(JSON.stringify({ 
            success: true, 
            batchId: batchId,
            message: `Successfully queued ${candidates.length} candidates for evaluation.` 
        }), { status: 202 }); // 202 Accepted

    } catch (error) {
        console.error("[BatchRoute] Error queuing bulk process:", error);
        return new Response(JSON.stringify({ success: false, error: "Server failed to queue batch." }), { status: 500 });
    }
}

export async function getBatchStatusHandler(req: Request, context: any): Promise<Response> {
    try {
        const url = new URL(req.url);
        const batchId = url.pathname.split('/').pop();

        if (!batchId) {
            return new Response(JSON.stringify({ success: false, error: "Batch ID required" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        const ticket = await db.collection('batch_tickets').findOne({ _id: new ObjectId(batchId) });
        
        if (!ticket) {
            return new Response(JSON.stringify({ success: false, error: "Batch not found" }), { status: 404 });
        }

        // Determine if it's finished based on counts
        const isComplete = (ticket.processedCount >= ticket.totalCount);
        if (isComplete && ticket.status !== 'COMPLETE') {
            await db.collection('batch_tickets').updateOne(
                { _id: new ObjectId(batchId) },
                { $set: { status: 'COMPLETE', completedAt: new Date() } }
            );
            ticket.status = 'COMPLETE';
        }

        return new Response(JSON.stringify({
            success: true,
            status: ticket.status,
            total: ticket.totalCount,
            processed: ticket.processedCount,
            failed: ticket.failedCount,
            percentage: Math.round((ticket.processedCount / ticket.totalCount) * 100)
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch status" }), { status: 500 });
    }
}
