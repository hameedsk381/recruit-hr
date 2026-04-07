import { chatWithCopilot } from "../services/recruiterCopilot";
import { AuthContext } from "../middleware/authMiddleware";
import { createLogger } from "../utils/logger";

/**
 * Handle unified Copilot chat requests
 */
export async function copilotChatHandler(req: Request, context: AuthContext): Promise<Response> {
    const logger = createLogger(crypto.randomUUID(), 'CopilotChatHandler', context.tenantId, context.userId);

    try {
        const body = await req.json();
        const { query, candidateId, context: appState } = body;

        if (!query) {
            return new Response(JSON.stringify({ success: false, error: 'Query is required' }), { status: 400 });
        }

        logger.info(`Processing copilot chat: ${query.substring(0, 50)}...`);

        const result = await chatWithCopilot({
            query,
            tenantId: context.tenantId,
            candidateId,
            context: appState
        });

        return new Response(JSON.stringify({
            success: true,
            ...result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        logger.error('Copilot chat error', error as Error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to process copilot request'
        }), { status: 500 });
    }
}
