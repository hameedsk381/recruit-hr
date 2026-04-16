import { z } from 'zod';
import { OfferAcceptanceModel } from '../../services/ai/offerAcceptanceModel';
import { TimeToFillModel } from '../../services/ai/timeToFillModel';
import { RetentionRiskModel } from '../../services/ai/retentionRiskModel';
import { FeedbackLoop } from '../../services/ai/feedbackLoop';
import { AuthContext } from '../../middleware/authMiddleware';

const OfferPredictSchema = z.object({
  candidate: z.object({
    currentRole: z.string().optional(),
    currentCompany: z.string().optional(),
    experienceYears: z.number().optional(),
    skills: z.array(z.string()).optional(),
  }),
  offer: z.object({
    compensation: z.object({
      base: z.number(),
      currency: z.string(),
      bonus: z.number().optional(),
      signingBonus: z.number().optional(),
    }),
    startDate: z.string().optional(),
  }),
  marketData: z.object({
    medianBase: z.number(),
    p75Base: z.number(),
    currency: z.string(),
  }),
  daysInProcess: z.number().default(0),
});

const TimeToFillSchema = z.object({
  title: z.string().min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  remote: z.boolean().optional(),
});

const RetentionRiskSchema = z.object({
  tenure_months: z.number(),
  role: z.string().min(1),
  department: z.string().optional(),
  recentPromotion: z.boolean().optional(),
  performanceScore: z.number().optional(),
  compensationVsMarket: z.enum(['below', 'at', 'above']).optional(),
  managerChanges: z.number().optional(),
  teamChanges: z.number().optional(),
});

const OutcomeSchema = z.object({
  decisionType: z.string().min(1),
  resourceId: z.string().min(1),
  outcome: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function predictOfferAcceptanceHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = OfferPredictSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const prediction = await OfferAcceptanceModel.predict(
    context.tenantId,
    parsed.data.candidate,
    parsed.data.offer,
    parsed.data.marketData,
    parsed.data.daysInProcess
  );
  return Response.json({ success: true, prediction });
}

export async function predictTimeToFillHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = TimeToFillSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const prediction = await TimeToFillModel.predict(context.tenantId, parsed.data);
  return Response.json({ success: true, prediction });
}

export async function predictRetentionRiskHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = RetentionRiskSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const prediction = await RetentionRiskModel.predict(context.tenantId, parsed.data);
  return Response.json({ success: true, prediction });
}

export async function recordOutcomeHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = OutcomeSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  await FeedbackLoop.recordDecision(
    context.tenantId,
    parsed.data.decisionType,
    parsed.data.resourceId,
    parsed.data.outcome,
    parsed.data.metadata as Record<string, unknown>
  );
  return Response.json({ success: true });
}

export async function getAIWeightsHandler(req: Request, context: AuthContext): Promise<Response> {
  const weights = await FeedbackLoop.getWeights(context.tenantId);
  return Response.json({ success: true, weights });
}
