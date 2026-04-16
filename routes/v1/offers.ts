import { z } from 'zod';
import { OfferService } from '../../services/offerService';
import { ESignService } from '../../services/esignService';
import { AuthContext } from '../../middleware/authMiddleware';
import { ObjectId } from 'mongodb';

const CreateOfferSchema = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().min(1),
  requisitionId: z.string().min(1),
  compensation: z.object({
    base: z.number().positive(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']),
    bonus: z.number().optional(),
    equity: z.string().optional(),
    signingBonus: z.number().optional(),
    benefits: z.array(z.string()).default([]),
  }),
  startDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  letterTemplate: z.string().optional(),
  signingProvider: z.enum(['docusign', 'adobe_sign', 'manual']).default('manual'),
  approvalChain: z.array(z.object({
    approverRole: z.string(),
    approverId: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  })).default([]),
});

const ApproveSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

const SendOfferSchema = z.object({
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  offerLetterHtml: z.string().optional(),
});

function notFound(requestId = crypto.randomUUID()) {
  return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found', requestId } }, { status: 404 });
}

export async function createOfferHandler(req: Request, context: AuthContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const parsed = CreateOfferSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId } }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    candidateId: new ObjectId(parsed.data.candidateId),
    jobId: new ObjectId(parsed.data.jobId),
    requisitionId: new ObjectId(parsed.data.requisitionId),
    startDate: new Date(parsed.data.startDate),
    expiryDate: new Date(parsed.data.expiryDate),
    createdBy: context.userId,
  };

  const offer = await OfferService.create(context.tenantId, data as any, context.userId);
  return Response.json({ success: true, offer }, { status: 201 });
}

export async function getOfferHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const offer = await OfferService.getById(context.tenantId, id);
  if (!offer) return notFound();
  return Response.json({ success: true, offer });
}

export async function updateOfferHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const updated = await OfferService.update(context.tenantId, id, body, context.userId);
  if (!updated) return notFound(requestId);
  return Response.json({ success: true, offer: updated });
}

export async function sendOfferHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const parsed = SendOfferSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId } }, { status: 400 });
  }

  const offer = await OfferService.getById(context.tenantId, id);
  if (!offer) return notFound(requestId);

  let envelopeId: string | undefined;
  if (offer.signingProvider === 'docusign' && parsed.data.offerLetterHtml) {
    envelopeId = await ESignService.sendForSignature({
      candidateName: parsed.data.candidateName,
      candidateEmail: parsed.data.candidateEmail,
      offerLetterHtml: parsed.data.offerLetterHtml,
      offerId: id,
    });
  }

  const updated = await OfferService.send(context.tenantId, id, context.userId, envelopeId);
  return Response.json({ success: true, offer: updated, envelopeId });
}

export async function approveOfferHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId } }, { status: 400 });
  }

  const updated = await OfferService.approve(context.tenantId, id, context.userId, parsed.data.decision, parsed.data.comment);
  if (!updated) return notFound(requestId);
  return Response.json({ success: true, offer: updated });
}

export async function withdrawOfferHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const updated = await OfferService.withdraw(context.tenantId, id, context.userId);
  if (!updated) return notFound();
  return Response.json({ success: true, offer: updated });
}

export async function listOfferTemplatesHandler(req: Request, context: AuthContext): Promise<Response> {
  const templates = await OfferService.listTemplates(context.tenantId);
  return Response.json({ success: true, templates });
}

export async function createOfferTemplateHandler(req: Request, context: AuthContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId } }, { status: 400 });
  }

  const template = await OfferService.createTemplate(context.tenantId, body, context.userId);
  return Response.json({ success: true, template }, { status: 201 });
}

export async function esignWebhookHandler(req: Request): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  const result = ESignService.parseWebhook(body);
  if (result.status) {
    // tenantId is resolved from envelope lookup — for now we iterate by envelopeId across tenants
    // In production, store tenantId alongside envelopeId
    const { getMongoDb } = await import('../../utils/mongoClient');
    const db = getMongoDb();
    const offer = await db.collection('offers').findOne({ signingEnvelopeId: result.envelopeId });
    if (offer) {
      await OfferService.updateSigningStatus(offer.tenantId, result.envelopeId, result.status);
    }
  }

  return Response.json({ success: true });
}
