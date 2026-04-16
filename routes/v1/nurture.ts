import { z } from 'zod';
import { SequenceEngine } from '../../services/nurture/sequenceEngine';
import { OutreachService } from '../../services/outreachService';
import { AuthContext } from '../../middleware/authMiddleware';

const StepSchema = z.object({
  order: z.number().int().nonnegative(),
  delayDays: z.number().nonnegative(),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  templateId: z.string().min(1),
  condition: z.string().optional(),
});

const CreateSequenceSchema = z.object({
  name: z.string().min(1),
  triggerEvent: z.enum(['added_to_pool', 'job_match_found', 'manual']),
  steps: z.array(StepSchema).min(1),
  isActive: z.boolean().default(true),
});

const SendEmailSchema = z.object({
  profileId: z.string().min(1),
  toEmail: z.string().email(),
  toName: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  templateId: z.string().optional(),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function listSequencesHandler(req: Request, context: AuthContext): Promise<Response> {
  const sequences = await SequenceEngine.listSequences(context.tenantId);
  return Response.json({ success: true, sequences });
}

export async function createSequenceHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = CreateSequenceSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const sequence = await SequenceEngine.createSequence(context.tenantId, parsed.data);
  return Response.json({ success: true, sequence }, { status: 201 });
}

export async function sendOutreachEmailHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = SendEmailSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const message = await OutreachService.sendEmail({ ...parsed.data, tenantId: context.tenantId, userId: context.userId });
  return Response.json({ success: true, message });
}

export async function listOutreachHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const messages = await OutreachService.listMessages(context.tenantId, url.searchParams.get('profileId') || undefined);
  return Response.json({ success: true, messages });
}

export async function outreachTrackingWebhook(req: Request): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ success: false }, { status: 400 }); }
  if (body.messageId && body.event) {
    await OutreachService.handleTrackingEvent(body.messageId, body.event);
  }
  return Response.json({ success: true });
}
