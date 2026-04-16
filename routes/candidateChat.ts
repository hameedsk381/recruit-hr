import { CandidateChatService } from "../services/candidateChatService";
import { verifyMagicLinkToken } from "../utils/magicLink";

/**
 * Handle incoming chat messages from a candidate during pre-screening
 */
export async function candidateChatHandler(req: Request): Promise<Response> {
    try {
        const body = await req.json();
        const { message, token } = body;

        if (!message || !token) {
            return new Response(JSON.stringify({ success: false, error: "Missing message or token" }), { status: 400 });
        }

        // 1. Verify Token
        const payload = verifyMagicLinkToken(token);
        if (!payload) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized. Invalid magic link." }), { status: 401 });
        }

        // 2. Delegate to Service
        const { response, isFinished } = await CandidateChatService.handleChatMessage({
            applicationId: payload.candidateId,
            tenantId: payload.tenantId,
            message
        });

        return new Response(JSON.stringify({ 
            success: true, 
            response, 
            isFinished 
        }), { status: 200 });

    } catch (error) {
        console.error("[CandidateChat] Error:", error);
        return new Response(JSON.stringify({ success: false, error: "Chat failed" }), { status: 500 });
    }
}
