import { assessmentQueue } from "../services/queueService";
import { BatchService } from "../services/batchService";
import { AuthContext } from "../middleware/authMiddleware";

/**
 * Checks the status of a specific batch or job ID
 */
export async function jobStatusHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const url = new URL(req.url);
        const batchId = url.searchParams.get('batchId');
        const jobId = url.searchParams.get('jobId');

        // Priority 1: Check Batch Status (Grouped)
        if (batchId) {
            const batch = await BatchService.getBatchStatus(batchId, context.tenantId);
            if (!batch) {
                return new Response(JSON.stringify({ success: false, error: 'Batch not found' }), { status: 404 });
            }

            return new Response(JSON.stringify({
                success: true,
                type: 'BATCH',
                batchId: batch.batchId,
                status: batch.status,
                progress: {
                    total: batch.totalJobs,
                    completed: batch.completedJobs,
                    failed: batch.failedJobs,
                    percentage: Math.round(((batch.completedJobs + batch.failedJobs) / batch.totalJobs) * 100)
                },
                results: batch.status === 'COMPLETED' ? batch.results : []
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Priority 2: Check Individual Job Status (BullMQ)
        if (jobId) {
            const job = await assessmentQueue.getJob(jobId);
            if (!job) {
                return new Response(JSON.stringify({ success: false, error: 'Job not found' }), { status: 404 });
            }

            if (job.data.tenantId !== context.tenantId) {
                return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 403 });
            }

            const state = await job.getState();
            return new Response(JSON.stringify({
                success: true,
                type: 'SINGLE_JOB',
                jobId: job.id,
                state,
                result: state === 'completed' ? job.returnvalue : null
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: false, error: 'Provide batchId or jobId' }), { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Internal Error' }), { status: 500 });
    }
}
