
import { ReportBuilder, ReportConfig } from "../../services/analytics/reportBuilder";
import { AuthContext } from "../../middleware/authMiddleware";

export async function generateReportHandler(req: Request, context: AuthContext) {
    try {
        const config = await req.json() as ReportConfig;
        if (!config.metric || !config.dimension) {
            return new Response(JSON.stringify({ success: false, error: "Metric and Dimension are required" }), { status: 400 });
        }

        const report = await ReportBuilder.generateReport(context.tenantId, config);
        return new Response(JSON.stringify(report), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}
