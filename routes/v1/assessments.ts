import { AssessmentService } from "../../services/assessmentService";
import { getMongoDb } from "../../utils/mongoClient";
import { AuthContext } from "../../middleware/authMiddleware";

export async function getDynamicAssessmentHandler(req: Request, context: AuthContext): Promise<Response> {
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');

    if (!batchId) return Response.json({ success: false, error: "Missing batchId" }, { status: 400 });

    const db = getMongoDb();
    const batch = await db.collection('assessment_batches').findOne({ batchId, tenantId: context.tenantId });
    
    if (!batch) return Response.json({ success: false, error: "Batch not found" }, { status: 404 });

    // For the demo, we generate a problem based on the first candidate in the batch or the job itself
    const problem = await AssessmentService.generateDynamicProblem(batch.jobData, { 
        name: 'Applicant', 
        email: '', 
        skills: [], 
        experience: [], 
        education: [], 
        certifications: [], 
        phone: '',
        industrialExperience: [],
        domainExperience: [],
        totalIndustrialExperienceYears: 0,
        totalDomainExperienceYears: 0
    });

    // Persistent storage for the problem
    await db.collection('assessment_problems').updateOne(
        { id: problem.id },
        { $set: { ...problem, batchId, tenantId: context.tenantId, createdAt: new Date() } },
        { upsert: true }
    );

    return Response.json({ success: true, problem });
}

export async function submitAssessmentHandler(req: Request, context: AuthContext): Promise<Response> {
    const body = await req.json();
    const { problemId, submission, candidateId, batchId } = body;

    const db = getMongoDb();
    
    // Fetch the real problem from DB
    const problem = await db.collection('assessment_problems').findOne({ id: problemId });
    
    if (!problem) {
        return Response.json({ success: false, error: "Assessment problem context not found" }, { status: 404 });
    }

    const result = await AssessmentService.gradeSubmission(problem as any, submission);

    await db.collection('assessment_submissions').insertOne({
        candidateId,
        batchId,
        problemId,
        submission,
        result,
        submittedAt: new Date(),
        tenantId: context.tenantId
    });

    return Response.json({ success: true, evaluation: result });
}
