import { PredictionService } from "../../services/analytics/predictionService";
import { AuthContext } from "../../middleware/authMiddleware";

export async function getHiringForecastHandler(req: Request, context: AuthContext): Promise<Response> {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId') || undefined;

    try {
        const forecast = await PredictionService.getHiringForecast(context.tenantId, jobId);
        return Response.json({ success: true, forecast });
    } catch (error) {
        return Response.json({ success: false, error: "Failed to generate forecast" }, { status: 500 });
    }
}
