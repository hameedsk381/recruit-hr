import { PrivacyService } from "../services/privacyService";
import { AppLogger } from "../utils/logger";
import { logAudit } from "../services/auditService";

export async function deleteCandidateGdprHandler(req: Request, context: any): Promise<Response> {
    const url = new URL(req.url);
    const candidateId = url.pathname.split("/").pop(); // Assumes route is like /privacy/candidate/{id}

    if (!candidateId) {
        return new Response(JSON.stringify({ success: false, error: "Candidate ID required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const logger = new AppLogger(context.tenantId, context.userId || 'system', "RightToBeForgotten");

    try {
        await PrivacyService.deleteCandidateData(candidateId);
        
        logAudit(logger, "DELETE_CANDIDATE_DATA", {
            reason: "GDPR Article 17 Request (Right to be Forgotten)",
            candidateId: candidateId
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Candidate data and references successfully anonymized/deleted line with GDPR Article 17" 
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error(`[PrivacyRoute] Failed deleting candidate ${candidateId}:`, error);
        
        logAudit(logger, "DELETE_CANDIDATE_FAILED", { error: String(error), candidateId }, "FAILURE");
        
        return new Response(JSON.stringify({ success: false, error: "Failed to erase candidate data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function runRetentionPolicyHandler(req: Request, context: any): Promise<Response> {
    // Usually triggered by authenticated cron or super-admin only.
    // Ensure `context` carries admin credentials if needed.

    const logger = new AppLogger(context.tenantId, context.userId || 'system', "DataRetentionPolicy");

    try {
        // Run with default 6 month retention
        const deletedCount = await PrivacyService.enforceDataRetention(6);

        logAudit(logger, "ENFORCE_RETENTION_POLICY", {
            reason: "GDPR Article 5 (Storage Limitation)",
            deletedCount: deletedCount
        });

        return new Response(JSON.stringify({ 
            success: true, 
            deleted_count: deletedCount, 
            message: "Retention policy successfully enforced." 
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(`[PrivacyRoute] Retention cron failed:`, error);
        return new Response(JSON.stringify({ success: false, error: "Internal retention task failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
