import { getMongoDb } from "../utils/mongoClient";
import { AuthContext } from "../middleware/authMiddleware";
import { ObjectId } from "mongodb";
import { WorkflowService } from "../services/workflowService";

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

        // NEW: Fetch Candidate Portal Data (Screening Summaries)
        const applicationEmails = batch.results.map((r: any) => r.matchResult.profile?.email).filter(Boolean);
        const applications = await db.collection('applications')
            .find({ email: { $in: applicationEmails }, tenantId: context.tenantId })
            .toArray();

        // Map applications for quick lookup
        const appMap = new Map(applications.map(app => [app.email, app]));

        return new Response(JSON.stringify({
            success: true,
            state: {
                batchId: batch.batchId,
                job: batch.jobData,
                status: batch.status,
                candidates: batch.results.map((r: any) => {
                    const email = r.matchResult.profile?.email;
                    const app = appMap.get(email);
                    return {
                        ...r.matchResult,
                        id: r.matchResult.Id || r.matchResult.resumeName,
                        stage: r.stage || 'applied',
                        removed: r.removed || false,
                        // Append Candidate Portal Insights
                        screeningSummary: app?.screeningSummary || null,
                        portalStatus: app?.status || 'unverified',
                        applicationId: app?._id || null
                    };
                })
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
        const { batchId, candidateId, stage, removed, removalReason, hmDecision, hmNotes } = body;

        if (!batchId || !candidateId) {
            return new Response(JSON.stringify({ success: false, error: "Missing match identifiers" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // Update the specific result within the batch results array
        // We use positional operator $[elem] to find the candidate by name/ID
        const updateFields: any = {
            "results.$[elem].stage": stage,
            "results.$[elem].removed": removed,
            "results.$[elem].removal_reason": removalReason,
            "updatedAt": new Date()
        };

        if (hmDecision) updateFields["results.$[elem].hmDecision"] = hmDecision;
        if (hmNotes) updateFields["results.$[elem].hmNotes"] = hmNotes;

        await db.collection('assessment_batches').updateOne(
            { batchId, userId: context.userId, tenantId: context.tenantId },
            { $set: updateFields },
            { 
                arrayFilters: [{ 
                    $or: [
                        { "elem.matchResult.Id": candidateId },
                        { "elem.resumeName": candidateId }
                    ]
                }] 
            }
        );

        // --- ASYNC WORKFLOW TRIGGERS ---
        // 1. Triggered if a candidate is moved to 'shortlisted' stage
        if (stage === 'shortlisted') {
            await WorkflowService.triggerEvent({
                type: 'CANDIDATE_SHORTLISTED',
                tenantId: context.tenantId,
                payload: {
                    candidateId,
                    candidateName: candidateId, // Better to fetch name, but using ID as surrogate for now
                    jobTitle: "Open Position", // Should ideally be fetched from jobData
                    hmEmail: context.email // In production, this would be the actual HM's email
                }
            });
        }

        // 2. Triggered on HM Decision
        if (hmDecision) {
            await WorkflowService.triggerEvent({
                type: 'HM_DECISION_FINALIZED',
                tenantId: context.tenantId,
                payload: {
                    candidateName: candidateId,
                    decision: hmDecision,
                    notes: hmNotes,
                    recruiterEmail: context.email // Notify the initiator/recruiter
                }
            });
        }

        return new Response(JSON.stringify({ success: true, message: "Candidate updated and workflow triggered" }), { status: 200 });

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
