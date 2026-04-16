import { z } from 'zod';
import { ReferralService } from '../../services/referralService';
import { AuthContext } from '../../middleware/authMiddleware';

const SubmitReferralSchema = z.object({
  referrerId: z.string().min(1),
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  candidatePhone: z.string().optional(),
  requisitionId: z.string().optional(),
  notes: z.string().optional(),
});

const StatusSchema = z.object({
  status: z.enum(['submitted', 'reviewing', 'shortlisted', 'hired', 'rejected']),
});

const BonusSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function submitReferralHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = SubmitReferralSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const referral = await ReferralService.submit(context.tenantId, parsed.data, context.userId);
  return Response.json({ success: true, referral }, { status: 201 });
}

export async function listReferralsHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const referrals = await ReferralService.list(context.tenantId, {
    status: url.searchParams.get('status') || undefined,
    referrerId: url.searchParams.get('referrerId') || undefined,
  });
  return Response.json({ success: true, referrals });
}

export async function updateReferralStatusHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const referral = await ReferralService.updateStatus(context.tenantId, id, parsed.data.status, context.userId);
  if (!referral) return err('NOT_FOUND', 'Referral not found', 404);
  return Response.json({ success: true, referral });
}

export async function payReferralBonusHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = BonusSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  await ReferralService.recordBonus(context.tenantId, id, parsed.data, context.userId);
  return Response.json({ success: true });
}
