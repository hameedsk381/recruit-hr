import { outreachService } from "../services/ai/outreachService";

export async function draftOutreachHandler(req: Request, context: any) {
    try {
        const body = await req.json();
        const { jobContext, candidateProfile, assessment, type } = body;

        if (!jobContext || !candidateProfile || !assessment || !type) {
            return Response.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const draft = await outreachService.draftEmail(jobContext, candidateProfile, assessment, type);

        return Response.json({
            success: true,
            draft
        });
    } catch (error: any) {
        console.error("Draft outreach error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
