import { z } from 'zod';
import { BiasDetector } from '../../services/ai/biasDetector';
import { AuthContext } from '../../middleware/authMiddleware';

const ScanJDSchema = z.object({
  jdText: z.string().min(1),
});

const BiasReportSchema = z.object({
  requisitionId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function scanJDHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = ScanJDSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const flags = await BiasDetector.scanJD(parsed.data.jdText);
  return Response.json({ success: true, flags, clean: flags.length === 0 });
}

export async function generateBiasReportHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = BiasReportSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const report = await BiasDetector.generateFunnelReport(
    context.tenantId,
    parsed.data.requisitionId,
    new Date(parsed.data.from),
    new Date(parsed.data.to)
  );
  return Response.json({ success: true, report });
}
