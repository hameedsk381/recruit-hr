import { z } from 'zod';
import { JobBoardService } from '../../services/jobBoardService';
import { AuthContext } from '../../middleware/authMiddleware';

const PublishSchema = z.object({
  requisitionId: z.string().min(1),
  platform: z.enum(['linkedin', 'indeed', 'naukri', 'glassdoor', 'dice', 'monster']),
  jd: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    location: z.string().optional(),
    department: z.string().optional(),
  }),
  requisitionMeta: z.object({
    title: z.string().min(1),
    department: z.string().optional(),
    location: z.string().optional(),
  }),
  credentials: z.record(z.string()),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function listJobPostingsHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const filters = {
    platform: url.searchParams.get('platform') || undefined,
    status: url.searchParams.get('status') || undefined,
    requisitionId: url.searchParams.get('requisitionId') || undefined,
  };
  const postings = await JobBoardService.list(context.tenantId, filters);
  return Response.json({ success: true, postings });
}

export async function publishJobPostingHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const posting = await JobBoardService.publish(
    context.tenantId,
    parsed.data.requisitionId,
    parsed.data.jd,
    { tenantId: context.tenantId, ...parsed.data.requisitionMeta },
    parsed.data.platform,
    parsed.data.credentials,
    context.userId
  );
  return Response.json({ success: true, posting }, { status: 201 });
}

export async function getJobPostingMetricsHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const posting = await JobBoardService.getMetrics(context.tenantId, id);
  if (!posting) return err('NOT_FOUND', 'Job posting not found', 404);
  return Response.json({ success: true, posting });
}

export async function unpublishJobPostingHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  await JobBoardService.unpublish(context.tenantId, id, body.credentials || {}, context.userId);
  return Response.json({ success: true });
}

export async function syncApplicationsHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const count = await JobBoardService.syncApplications(context.tenantId, id, body.credentials || {});
  return Response.json({ success: true, synced: count });
}
