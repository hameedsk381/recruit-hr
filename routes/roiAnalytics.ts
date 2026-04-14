import { ROIAnalyticsService } from "../services/roiAnalyticsService";

export async function getRoiAnalyticsHandler(req: Request, context: any): Promise<Response> {
    try {
        const tenantId = context.tenantId;
        
        if (!tenantId) {
            return new Response(JSON.stringify({ success: false, error: "Tenant identification missing" }), { status: 401 });
        }

        const stats = await ROIAnalyticsService.getTenantROI(tenantId);
        const jobBreakdown = await ROIAnalyticsService.getJOBSavingsBreakdown(tenantId);

        return new Response(JSON.stringify({
            success: true,
            currency: "INR",
            summary: stats,
            top_jobs: jobBreakdown,
            timestamp: new Date()
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("[ROIAnalyticsRoute] Error generating ROI report:", error);
        return new Response(JSON.stringify({ success: false, error: "Failed to generate ROI report" }), { status: 500 });
    }
}
