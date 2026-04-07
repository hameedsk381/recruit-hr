import { assessmentQueue } from "../services/queueService";
import { extractJobDescriptionData } from "../services/jdExtractor";
import { BatchService } from "../services/batchService";
import { AuthContext } from "../middleware/authMiddleware";
import { v4 as uuidv4 } from 'uuid';

export async function jobMatchHandler(req: Request, context: AuthContext): Promise<Response> {
  try {
    const formData = await req.formData();
    const jdFile = (formData.get('job_description') || formData.get('jobDescription')) as unknown;
    const jdDataJson = formData.get('jd_data') as string;
    const resumeFiles = formData.getAll('resumes').filter(f => f instanceof File) as File[];

    let jdData: any;

    if (jdDataJson) {
      try {
        jdData = JSON.parse(jdDataJson);
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JD JSON data' }), { status: 400 });
      }
    } else if (jdFile && jdFile instanceof File && jdFile.size > 0) {
      const jdBuffer = await jdFile.arrayBuffer();
      jdData = await extractJobDescriptionData(Buffer.from(jdBuffer));
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing JD (either as file or JSON data)'
      }), { status: 400 });
    }

    if (resumeFiles.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Resumes'
      }), { status: 400 });
    }

    const batchId = uuidv4();

    // 1. Persist Batch Meta in DB
    await BatchService.createBatch({
      batchId,
      tenantId: context.tenantId,
      userId: context.userId,
      status: 'PROCESSING',
      totalJobs: resumeFiles.length
    });

    // 2. Queue each resume
    const jobIds = [];
    for (const file of resumeFiles) {
      const buffer = await file.arrayBuffer();
      const job = await assessmentQueue.add('analyze', {
        jdData,
        resumeBuffer: Buffer.from(buffer),
        resumeName: file.name,
        tenantId: context.tenantId,
        userId: context.userId,
        batchId // Attach batchId for worker tracking
      });
      jobIds.push(job.id);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Assessment batch started",
      batchId,
      jobCount: jobIds.length
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}