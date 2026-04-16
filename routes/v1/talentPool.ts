import { z } from 'zod';
import { TalentPoolService } from '../../services/talentPoolService';
import { AuthContext } from '../../middleware/authMiddleware';
import { PiiService } from '../../services/piiService';

const AddProfileSchema = z.object({
  source: z.enum(['applied', 'sourced', 'referred', 'imported', 'rehire']),
  sourceDetail: z.string().default(''),
  candidate: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experienceYears: z.number().optional(),
    currentRole: z.string().optional(),
    currentCompany: z.string().optional(),
    location: z.string().optional(),
  }),
  tags: z.array(z.string()).default([]),
  gdprConsent: z.object({
    given: z.boolean(),
    date: z.string().datetime(),
    channel: z.string(),
  }).optional(),
});

const NurtureSchema = z.object({ sequenceId: z.string().min(1) });
const NoteSchema = z.object({ text: z.string().min(1) });

const BulkImportSchema = z.object({
  profiles: z.array(AddProfileSchema).min(1),
});

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

export async function searchTalentPoolHandler(req: Request, context: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const result = await TalentPoolService.search(context.tenantId, {
    text: url.searchParams.get('q') || undefined,
    tags: url.searchParams.get('tags')?.split(',').filter(Boolean),
    stage: url.searchParams.get('stage') || undefined,
    source: url.searchParams.get('source') || undefined,
    limit: Number(url.searchParams.get('limit') || 20),
    offset: Number(url.searchParams.get('offset') || 0),
  });

  // Phase 5: PII Data Masking
  if (result.profiles) {
    result.profiles = result.profiles.map((p: any) => PiiService.scrubCandidate(p, context.roles));
  }

  return Response.json({ success: true, ...result });
}

export async function addToTalentPoolHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = AddProfileSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const data = {
    ...parsed.data,
    notes: [],
    pipeline: { currentStage: 'applied', lastActivity: new Date() },
    nurture: { enrolled: false },
    gdprConsent: parsed.data.gdprConsent
      ? { ...parsed.data.gdprConsent, date: new Date(parsed.data.gdprConsent.date) }
      : { given: false, date: new Date(), channel: 'manual' },
  };

  const profile = await TalentPoolService.add(context.tenantId, data, context.userId);
  return Response.json({ success: true, profile }, { status: 201 });
}

export async function getTalentProfileHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  const profile = await TalentPoolService.getById(context.tenantId, id);
  if (!profile) return err('NOT_FOUND', 'Profile not found', 404);

  // Phase 5: PII Data Masking
  const scrubbedProfile = PiiService.scrubCandidate(profile, context.roles);

  return Response.json({ success: true, profile: scrubbedProfile });
}

export async function updateTalentProfileHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  // Handle add-note shortcut
  if (body._addNote) {
    const parsed = NoteSchema.safeParse(body);
    if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);
    const profile = await TalentPoolService.addNote(context.tenantId, id, parsed.data.text, context.userId);
    if (!profile) return err('NOT_FOUND', 'Profile not found', 404);
    return Response.json({ success: true, profile });
  }

  const profile = await TalentPoolService.update(context.tenantId, id, body, context.userId);
  if (!profile) return err('NOT_FOUND', 'Profile not found', 404);
  return Response.json({ success: true, profile });
}

export async function enrollNurtureHandler(req: Request, context: AuthContext, id: string): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = NurtureSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const profile = await TalentPoolService.enrollNurture(context.tenantId, id, parsed.data.sequenceId, context.userId);
  if (!profile) return err('NOT_FOUND', 'Profile not found', 404);
  return Response.json({ success: true, profile });
}

export async function bulkImportHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  const parsed = BulkImportSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.message, 400);

  const profiles = parsed.data.profiles.map(p => ({
    ...p,
    notes: [] as any[],
    pipeline: { currentStage: 'applied', lastActivity: new Date() },
    nurture: { enrolled: false },
    gdprConsent: p.gdprConsent
      ? { ...p.gdprConsent, date: new Date(p.gdprConsent.date) }
      : { given: false, date: new Date(), channel: 'import' },
  }));

  const result = await TalentPoolService.bulkImport(context.tenantId, profiles, context.userId);
  return Response.json({ success: true, ...result });
}
export async function semanticSearchHandler(req: Request, context: AuthContext): Promise<Response> {
  let body: any;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON body', 400); }

  if (!body.query) return err('VALIDATION_ERROR', 'Missing query', 400);

  const profiles = await TalentPoolService.semanticSearch(context.tenantId, body.query, body.limit);
  return Response.json({ success: true, profiles });
}
