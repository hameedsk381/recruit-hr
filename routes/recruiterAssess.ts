import { RecruiterAssessmentInput } from "../types/recruiterCopilot";
import {
    generateRecruiterAssessment,
    convertLegacyToRecruiterInput,
} from "../services/recruiterCopilot";
import { extractResumeData } from "../services/resumeExtractor";
import { extractJobDescriptionData } from "../services/jdExtractor";
import { parsePDF } from "../utils/pdfParser";
import { downloadFileFromUrl } from "../utils/fileDownloader";
import { AuthContext } from "../middleware/authMiddleware";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * POST /assess-candidate
 *
 * Generates a recruiter-focused assessment for a candidate against a job description.
 *
 * Supports two input modes:
 * 1. Structured JSON input (preferred)
 * 2. PDF file upload (legacy compatibility)
 *
 * Structured Input Example:
 * {
 *   "job_description": { ... },
 *   "candidate_profile": { ... },
 *   "matching_signals": { ... }
 * }
 *
 * File Upload:
 * FormData with 'jd' (PDF) and 'resume' (PDF) files
 * OR 'jdUrl' and 'resumeUrl' fields with URLs to PDFs
 */
export async function recruiterAssessHandler(req: Request, context: AuthContext): Promise<Response> {
    const tenantId = context?.tenantId || "unknown";
    const userId = context?.userId || "unknown";
    console.log(`[RecruiterAssess] Received assessment request for tenant: ${tenantId}, user: ${userId}`);

    try {
        const contentType = req.headers.get("content-type") || "";

        let assessmentInput: RecruiterAssessmentInput;

        if (contentType.includes("application/json")) {
            // Handle structured JSON input
            const body = await req.json();

            // Check if this is the new structured format
            if (body.job_description && body.candidate_profile) {
                assessmentInput = body as RecruiterAssessmentInput;
                console.log("[RecruiterAssess] Using structured input format");
            } else if (body.jdUrl || body.resumeUrl) {
                // Handle URL-based input
                const { jdUrl, resumeUrl } = body;

                if (!jdUrl || !resumeUrl) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Both jdUrl and resumeUrl are required for URL-based input",
                        }),
                        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                console.log("[RecruiterAssess] Downloading files from URLs");

                const [jdFile, resumeFile] = await Promise.all([
                    downloadFileFromUrl(jdUrl),
                    downloadFileFromUrl(resumeUrl),
                ]);

                // Convert files to buffers
                const jdBuffer = Buffer.from(await jdFile.arrayBuffer());
                const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());

                // Extract data from files
                const [jdData, resumeData] = await Promise.all([
                    extractJobDescriptionData(jdBuffer),
                    extractResumeData(resumeBuffer, tenantId),
                ]);

                assessmentInput = convertLegacyToRecruiterInput(jdData, resumeData);
            } else {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error:
                            "Invalid JSON structure. Provide either structured input or jdUrl/resumeUrl.",
                    }),
                    { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            }
        } else if (contentType.includes("multipart/form-data")) {
            // Handle file upload (legacy compatibility)
            console.log("[RecruiterAssess] Processing file upload");

            const formData = await req.formData();
            const jdFile = formData.get("jd") as File | null;
            const resumeFile = formData.get("resume") as File | null;
            const jdUrl = formData.get("jdUrl") as string | null;
            const resumeUrl = formData.get("resumeUrl") as string | null;

            let jdBuffer: Buffer;
            let resumeBuffer: Buffer;

            // Get JD content
            if (jdFile) {
                jdBuffer = Buffer.from(await jdFile.arrayBuffer());
            } else if (jdUrl) {
                const downloadedJdFile = await downloadFileFromUrl(jdUrl);
                jdBuffer = Buffer.from(await downloadedJdFile.arrayBuffer());
            } else {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: "Job description required (provide 'jd' file or 'jdUrl')",
                    }),
                    { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            }

            // Get Resume content
            if (resumeFile) {
                resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
            } else if (resumeUrl) {
                const downloadedResumeFile = await downloadFileFromUrl(resumeUrl);
                resumeBuffer = Buffer.from(await downloadedResumeFile.arrayBuffer());
            } else {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: "Resume required (provide 'resume' file or 'resumeUrl')",
                    }),
                    { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            }

            // Extract structured data
            console.log("[RecruiterAssess] Extracting data from PDFs");
            const [jdData, resumeData] = await Promise.all([
                extractJobDescriptionData(jdBuffer),
                extractResumeData(resumeBuffer, tenantId),
            ]);

            // Convert to new format
            assessmentInput = convertLegacyToRecruiterInput(jdData, resumeData);
        } else {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Unsupported content type. Use application/json or multipart/form-data.",
                }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Generate the assessment
        console.log("[RecruiterAssess] Generating recruiter assessment");
        const assessment = await generateRecruiterAssessment(assessmentInput);

        // Check for error response
        if ("error" in assessment) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: assessment.error,
                }),
                { status: 422, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                assessment,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    } catch (error) {
        console.error("[RecruiterAssess] Error:", error);

        return new Response(
            JSON.stringify({
                success: false,
                error: `Assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
}

/**
 * POST /assess-batch
 *
 * Batch assessment for multiple candidates against a single job description.
 *
 * Input:
 * {
 *   "job_description": { ... },
 *   "candidates": [
 *     { "candidate_profile": { ... }, "matching_signals": { ... } },
 *     ...
 *   ]
 * }
 */
export async function recruiterBatchAssessHandler(req: Request, context: AuthContext): Promise<Response> {
    const tenantId = context?.tenantId || "unknown";
    const userId = context?.userId || "unknown";
    console.log(`[RecruiterAssess] Received batch assessment request for tenant: ${tenantId}, user: ${userId}`);

    try {
        const body = await req.json();

        if (!body.job_description || !Array.isArray(body.candidates)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Batch assessment requires job_description and candidates array",
                }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const { job_description, candidates } = body;

        console.log(`[RecruiterAssess] Processing ${candidates.length} candidates`);

        // Process candidates in parallel with concurrency limit
        const CONCURRENCY_LIMIT = 3;
        const results: Array<{
            candidate_name: string;
            assessment: any;
        }> = [];

        for (let i = 0; i < candidates.length; i += CONCURRENCY_LIMIT) {
            const batch = candidates.slice(i, i + CONCURRENCY_LIMIT);

            const batchResults = await Promise.all(
                batch.map(async (candidate: any) => {
                    const input: RecruiterAssessmentInput = {
                        job_description,
                        candidate_profile: candidate.candidate_profile,
                        matching_signals: candidate.matching_signals || {
                            experience_alignment: "unclear",
                            role_relevance: "medium",
                            mandatory_skills_met: true,
                        },
                    };

                    const assessment = await generateRecruiterAssessment(input);

                    return {
                        candidate_name: candidate.candidate_profile.name,
                        assessment,
                    };
                })
            );

            results.push(...batchResults);
        }

        // Sort by fit level for recruiter convenience
        const fitOrder = { high: 0, medium: 1, low: 2 };
        results.sort((a, b) => {
            const aFit = a.assessment.fit_assessment?.overall_fit || "low";
            const bFit = b.assessment.fit_assessment?.overall_fit || "low";
            return (
                (fitOrder[aFit as keyof typeof fitOrder] || 2) -
                (fitOrder[bFit as keyof typeof fitOrder] || 2)
            );
        });

        return new Response(
            JSON.stringify({
                success: true,
                job_title: job_description.title,
                total_candidates: results.length,
                assessments: results,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    } catch (error) {
        console.error("[RecruiterAssess] Batch error:", error);

        return new Response(
            JSON.stringify({
                success: false,
                error: `Batch assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
}
