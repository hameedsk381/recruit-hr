import { z } from 'zod';
import { BGVService, BGVCheckType, BGVProvider } from '../../services/bgvService';
import { AuthContext } from '../../middleware/authMiddleware';

const InitiateBGVSchema = z.object({
  candidateId: z.string().min(1),
  offerId: z.string().min(1),
  provider: z.enum(['authbridge', 'checkr', 'idfy', 'sterling']),
  checks: z.array(z.enum(['identity', 'employment', 'education', 'criminal', 'credit', 'address'])).min(1),
});

const DecideSchema = z.object({
  decision: z.enum(['proceed', 'hold', 'reject']),
  reason: z.string().min(1),
});

export async function initiateBGVHandler(req: Request, context: AuthContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const parsed = InitiateBGVSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId } }, { status: 400 });
  }

  const bgv = await BGVService.initiate(context.tenantId, {
    candidateId: parsed.data.candidateId,
    offerId: parsed.data.offerId,
    provider: parsed.data.provider as BGVProvider,
    checks: parsed.data.checks as BGVCheckType[],
  }, context.userId);

  return Response.json({ success: true, bgv }, { status: 201 });
}

export async function getBGVHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const bgv = await BGVService.getById(context.tenantId, id);
  if (!bgv) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'BGV request not found', requestId: crypto.randomUUID() } }, { status: 404 });
  return Response.json({ success: true, bgv });
}

export async function bgvWebhookHandler(req: Request): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  const url = new URL(req.url);
  const providerHint = url.searchParams.get('provider') as BGVProvider | undefined;

  await BGVService.handleWebhook(body, providerHint);
  return Response.json({ success: true });
}

export async function decideBGVHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const parsed = DecideSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId } }, { status: 400 });
  }

  const updated = await BGVService.decide(context.tenantId, id, parsed.data.decision, parsed.data.reason, context.userId);
  if (!updated) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'BGV request not found', requestId } }, { status: 404 });
  return Response.json({ success: true, bgv: updated });
}
