import { z } from 'zod';
import { RequisitionService } from '../../services/requisitionService';
import { AuthContext } from '../../middleware/authMiddleware';

const ApprovalStepSchema = z.object({
  approverRole: z.string().min(1),
  approverId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  comment: z.string().optional(),
});

const CreateRequisitionSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  location: z.string().min(1),
  headcount: z.number().int().positive(),
  budgetBand: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
    currency: z.string().min(1),
  }),
  justification: z.string().min(1),
  approvalChain: z.array(ApprovalStepSchema).default([]),
  hiringManagerId: z.string().min(1),
  recruiterId: z.string().optional(),
  targetHireDate: z.string().datetime(),
});

const ApproveSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

function jsonError(message: string, status: number, requestId: string) {
  return new Response(JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message, requestId } }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

export async function listRequisitionsHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const filters = {
    status: url.searchParams.get('status') || undefined,
    department: url.searchParams.get('department') || undefined,
  };
  const requisitions = await RequisitionService.list(context.tenantId, filters);
  return Response.json({ success: true, requisitions });
}

export async function createRequisitionHandler(req: Request, context: AuthContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400, requestId); }

  const parsed = CreateRequisitionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400, requestId);

  const data = { ...parsed.data, targetHireDate: new Date(parsed.data.targetHireDate) };
  const req2 = await RequisitionService.create(context.tenantId, data as any, context.userId);
  return Response.json({ success: true, requisition: req2 }, { status: 201 });
}

export async function getRequisitionHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requisition = await RequisitionService.getById(context.tenantId, id);
  if (!requisition) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Requisition not found', requestId: crypto.randomUUID() } }, { status: 404 });
  return Response.json({ success: true, requisition });
}

export async function updateRequisitionHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400, requestId); }

  const updated = await RequisitionService.update(context.tenantId, id, body, context.userId);
  if (!updated) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Requisition not found', requestId } }, { status: 404 });
  return Response.json({ success: true, requisition: updated });
}

export async function approveRequisitionHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400, requestId); }

  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400, requestId);

  const updated = await RequisitionService.approve(context.tenantId, id, context.userId, parsed.data.decision, parsed.data.comment);
  if (!updated) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Requisition not found', requestId } }, { status: 404 });
  return Response.json({ success: true, requisition: updated });
}

export async function publishRequisitionHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const updated = await RequisitionService.publish(context.tenantId, id, context.userId);
  if (!updated) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Requisition not found or not approved', requestId: crypto.randomUUID() } }, { status: 404 });
  return Response.json({ success: true, requisition: updated });
}

export async function deleteRequisitionHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  await RequisitionService.close(context.tenantId, id, context.userId);
  return Response.json({ success: true, message: 'Requisition closed' });
}
