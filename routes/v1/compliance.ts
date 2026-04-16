import { ComplianceService } from "../../services/complianceService";
import { AuthContext } from "../../middleware/authMiddleware";
import { ROLES } from "../../utils/permissions";

export async function getEeoReportHandler(req: Request, context: AuthContext) {
    if (!context.roles.includes(ROLES.ADMIN)) {
        return new Response(JSON.stringify({ error: "Access Denied" }), { status: 403 });
    }
    
    const report = await ComplianceService.generateEEOReport(context.tenantId);
    return new Response(JSON.stringify(report), { status: 200 });
}

export async function deleteCandidateGdprHandler(req: Request, context: AuthContext) {
    // This could be called by a Recruiter on behalf of a candidate or by the candidate themselves via a token
    const body = await req.json();
    const { email } = body;

    if (!email) {
        return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
    }

    // Protection: only Admins can trigger this, or the user themselves (if we had candidate auth)
    if (!context.roles.includes(ROLES.ADMIN)) {
        return new Response(JSON.stringify({ error: "Unauthorized self-purge" }), { status: 403 });
    }

    const result = await ComplianceService.handleGdprDeletionRequest(context.tenantId, email);
    return new Response(JSON.stringify(result), { status: 200 });
}
