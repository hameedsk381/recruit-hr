import { z } from 'zod';
import { RAGService } from '../../services/ai/ragService';
import { AuthContext } from '../../middleware/authMiddleware';

const IngestSchema = z.object({
  text: z.string().min(1),
  filename: z.string().min(1),
  type: z.enum(['comp_bands', 'role_framework', 'policy', 'handbook', 'sop', 'other']),
  description: z.string().optional(),
});

const QuerySchema = z.object({
  question: z.string().min(1),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function ingestDocumentHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const docId = await RAGService.ingestDocument(context.tenantId, parsed.data.text, {
    filename: parsed.data.filename,
    type: parsed.data.type,
    uploadedBy: context.userId,
    description: parsed.data.description,
  });
  return Response.json({ success: true, docId }, { status: 201 });
}

export async function queryKnowledgeHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const result = await RAGService.query(context.tenantId, parsed.data.question);
  return Response.json({ success: true, ...result });
}

export async function listDocumentsHandler(req: Request, context: AuthContext): Promise<Response> {
  const documents = await RAGService.listDocuments(context.tenantId);
  return Response.json({ success: true, documents });
}

export async function deleteDocumentHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  await RAGService.deleteDocument(context.tenantId, id);
  return Response.json({ success: true });
}
