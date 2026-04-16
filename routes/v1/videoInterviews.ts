import { z } from 'zod';
import { VideoInterviewService } from '../../services/videoInterviewService';
import { AuthContext } from '../../middleware/authMiddleware';

const CreateSessionSchema = z.object({
  interviewId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function createVideoSessionHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const session = await VideoInterviewService.createSession(
    context.tenantId,
    parsed.data.interviewId,
    new Date(parsed.data.scheduledAt),
    context.userId
  );
  return Response.json({ success: true, session }, { status: 201 });
}

export async function getVideoSessionHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const session = await VideoInterviewService.getSession(context.tenantId, id);
  if (!session) return err('NOT_FOUND', 'Session not found', 404);
  return Response.json({ success: true, session });
}

export async function listVideoSessionsHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const sessions = await VideoInterviewService.listSessions(
    context.tenantId,
    url.searchParams.get('interviewId') || undefined
  );
  return Response.json({ success: true, sessions });
}

export async function videoWebhookHandler(req: Request): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ success: false }, { status: 400 }); }

  const { tenantId, sessionId, event, payload } = body;
  if (tenantId && sessionId && event) {
    await VideoInterviewService.handleWebhook(tenantId, sessionId, event, payload || {});
  }
  return Response.json({ success: true });
}
