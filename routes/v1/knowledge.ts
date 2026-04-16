import { z } from 'zod';
import { RagService } from '../../services/ai/ragService';
import { AuthContext } from '../../middleware/authMiddleware';

const IngestSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(['policy', 'benefits', 'handbook', 'general']),
});

const QuerySchema = z.object({
  query: z.string().min(1),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function ingestDocumentHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const doc = await RagService.ingestDocument(context.tenantId, parsed.data);
  return Response.json({ success: true, documentId: doc._id }, { status: 201 });
}

export async function queryKnowledgeHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const answer = await RagService.queryKnowledge(context.tenantId, parsed.data.query);
  return Response.json({ success: true, answer });
}

export async function listDocumentsHandler(req: Request, context: AuthContext): Promise<Response> {
  // Skeleton for Phase 3
  return Response.json({ success: true, documents: [] });
}

export async function deleteDocumentHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  // Skeleton for Phase 3
  return Response.json({ success: true });
}
