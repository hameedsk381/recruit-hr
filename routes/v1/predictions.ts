import { z } from 'zod';
import { PredictiveAnalyticsService } from '../../services/v1/predictiveAnalytics';
import { AuthContext } from '../../middleware/authMiddleware';

const PredictionRequestSchema = z.object({
  resourceId: z.string().min(1),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function predictOfferAcceptanceHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const resourceId = url.searchParams.get('id');

  if (!resourceId) return err('MISSING_ID', 'Missing offer id', 400);

  try {
    const prediction = await PredictiveAnalyticsService.predictOfferAcceptance(context.tenantId, resourceId);
    return Response.json({ success: true, prediction });
  } catch (e: any) {
    return err('PREDICTION_FAILED', e.message, 500);
  }
}

export async function predictTimeToFillHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const resourceId = url.searchParams.get('id');

  if (!resourceId) return err('MISSING_ID', 'Missing requisition id', 400);

  const prediction = await PredictiveAnalyticsService.getTimeToFillPrediction(context.tenantId, resourceId);
  return Response.json({ success: true, prediction });
}

export async function predictRetentionRiskHandler(req: Request, context: AuthContext): Promise<Response> {
  // Skeleton implementation
  return Response.json({ success: true, prediction: { risk: 'low', confidence: 'high' } });
}

export async function recordOutcomeHandler(req: Request, context: AuthContext): Promise<Response> {
  // Used for model feedback loops
  return Response.json({ success: true });
}

export async function getAIWeightsHandler(req: Request, context: AuthContext): Promise<Response> {
  // Explainability endpoint
  return Response.json({ success: true, weights: { compensation: 0.4, sentiment: 0.3, trajectory: 0.3 } });
}
