import { getMongoDb } from "../utils/mongoClient";
import { AuthContext } from "../middleware/authMiddleware";
import { ObjectId } from "mongodb";

/**
 * Fetches the latest active batch and job description for the recruiter.
 */
export async function getActiveStateHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // Fetch the most recent batch for this user
        const latestBatch = await db.collection('assessment_batches')
            .find({ userId: context.userId, tenantId: context.tenantId })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();

        if (latestBatch.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: "No active state found",
                state: null
            }), { status: 200 });
        }

        const batch = latestBatch[0];

        return new Response(JSON.stringify({
            success: true,
            state: {
                batchId: batch.batchId,
                job: batch.jobData,
                status: batch.status,
                candidates: batch.results.map((r: any) => ({
                    ...r.matchResult,
                    id: r.matchResult.Id || r.matchResult.resumeName, // Fallback ID
                    stage: r.stage || 'applied', // Persistent stage
                    removed: r.removed || false
                }))
            }
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch active state" }), { status: 500 });
    }
}

/**
 * Updates a candidate's stage or metadata within a batch.
 */
export async function updateCandidateHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const body = await req.json();
        const { batchId, candidateId, stage, removed, removalReason } = body;

        if (!batchId || !candidateId) {
            return new Response(JSON.stringify({ success: false, error: "Missing match identifiers" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // Update the specific result within the batch results array
        // We use positional operator $[elem] to find the candidate by name/ID
        await db.collection('assessment_batches').updateOne(
            { batchId, userId: context.userId },
            { 
                $set: { 
                    "results.$[elem].stage": stage,
                    "results.$[elem].removed": removed,
                    "results.$[elem].removal_reason": removalReason,
                    "updatedAt": new Date()
                } 
            },
            { 
                arrayFilters: [{ 
                    $or: [
                        { "elem.matchResult.Id": candidateId },
                        { "elem.resumeName": candidateId }
                    ]
                }] 
            }
        );

        return new Response(JSON.stringify({ success: true, message: "Candidate updated" }), { status: 200 });

    } catch (error) {
        console.error('[UpdateCandidate] Error:', error);
        return new Response(JSON.stringify({ success: false, error: "Update failed" }), { status: 500 });
    }
}

/**
 * Fetches the recruiter's history of batches.
 */
export async function getRecruiterHistoryHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        const history = await db.collection('assessment_batches')
            .find({ userId: context.userId, tenantId: context.tenantId })
            .project({
                batchId: 1,
                status: 1,
                totalJobs: 1,
                completedJobs: 1,
                "jobData.title": 1,
                createdAt: 1
            })
            .sort({ createdAt: -1 })
            .toArray();

        return new Response(JSON.stringify({
            success: true,
            history: history.map(h => ({
                id: h.batchId,
                title: h.jobData?.title || "Untitled Search",
                status: h.status,
                candidateCount: h.totalJobs,
                date: h.createdAt
            }))
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch history" }), { status: 500 });
    }
}
