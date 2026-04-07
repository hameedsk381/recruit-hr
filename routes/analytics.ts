import { KpiService } from "../services/kpiService";
import { AuthContext } from "../middleware/authMiddleware";
import { createLogger } from "../utils/logger";

/**
 * Endpoint to retrieve recruitment analytics and KPIs
 */
export async function analyticsHandler(req: Request, context: AuthContext): Promise<Response> {
    const logger = createLogger(crypto.randomUUID(), 'AnalyticsHandler', context.tenantId, context.userId);

    try {
        logger.info('Retrieving dashboard KPIs');
        const kpis = await KpiService.getTenantKpis(context.tenantId);

        return new Response(JSON.stringify({
            success: true,
            kpis
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        logger.error('Failed to retrieve analytics', error as Error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to retrieve analytics'
        }), { status: 500 });
    }
}
