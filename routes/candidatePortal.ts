import { getMongoDb } from "../utils/mongoClient";
import { generateMagicLinkToken, verifyMagicLinkToken } from "../utils/magicLink";
import { NotificationService } from "../services/notificationService";
import { ObjectId } from "mongodb";
import { extractResumeData } from "../services/resumeExtractor";
import { matchMultipleJDsWithMultipleResumes } from "../services/multipleJobMatcher";

/**
 * AI Match-First: Analyze resume against all open jobs
 */
export async function matchMyResumeHandler(req: Request): Promise<Response> {
    try {
        const formData = await req.formData();
        const tenantId = formData.get("tenantId") as string;
        const resumeFile = formData.get("resume") as File;

        if (!tenantId || !resumeFile) {
            return new Response(JSON.stringify({ success: false, error: "Missing tenantId or resume" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // 1. Fetch all public jobs (published requisitions) for this tenant
        const jobs = await db.collection('requisitions')
            .find({ tenantId, status: 'published' })
            .toArray();

        if (jobs.length === 0) {
            return new Response(JSON.stringify({ success: true, matches: [], message: "No open roles found" }), { status: 200 });
        }

        // 2. Extract Resume Data
        const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
        const resumeData = await extractResumeData(resumeBuffer, resumeFile.name);

        // 3. Batch Match against all jobs
        // We construct JD data from requisition fields if full jdData isn't available
        const jdDataList = jobs.map(j => ({
            title: j.title,
            company: j.company || "Enterprise Partner",
            location: j.location || "Remote",
            department: j.department || "General",
            description: j.description || j.justification || "",
            skills: j.skills || [],
            salary: j.budgetBand ? `${j.budgetBand.min} - ${j.budgetBand.max} ${j.budgetBand.currency}` : "Not specified",
            requirements: j.requirements || [],
            responsibilities: j.responsibilities || [],
            industrialExperience: j.industrialExperience || [],
            domainExperience: j.domainExperience || [],
            requiredIndustrialExperienceYears: j.experience_expectations?.min_years || 0,
            requiredDomainExperienceYears: 0,
            employmentType: j.employmentType || "Full-time"
        }));

        const results = await matchMultipleJDsWithMultipleResumes({
            jdFiles: [],
            resumeFiles: [resumeFile],
            jdDataList,
            resumeUrls: [resumeFile.name], 
            tenantId
        });

        // 4. Map results back to job IDs for the frontend
        const enhancedMatches = results.map(r => {
            const job = jobs.find(j => j.title === r.jdTitle);
            return {
                jobId: job?._id?.toString() || job?.id,
                title: r.jdTitle,
                matchScore: r.matchScore,
                matchedSkills: r.matchedSkills,
                summary: r.summary,
                location: job?.location || "Remote",
                employmentType: job?.employmentType || "Full-time"
            };
        });

        return new Response(JSON.stringify({ 
            success: true, 
            matches: enhancedMatches 
        }), { status: 200 });

    } catch (error) {
        console.error("[MatchMyResume] Error:", error);
        return new Response(JSON.stringify({ success: false, error: "Matching failed" }), { status: 500 });
    }
}

/**
 * Handle public job application
 */
export async function publicApplyHandler(req: Request): Promise<Response> {
    try {
        const formData = await req.formData();
        const email = formData.get("email") as string;
        const name = formData.get("name") as string;
        const jobId = formData.get("jobId") as string;
        const tenantId = formData.get("tenantId") as string;
        const resume = formData.get("resume") as File;

        if (!email || !name || !jobId || !tenantId || !resume) {
            return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // 1. Extract Resume Data
        const resumeBuffer = Buffer.from(await resume.arrayBuffer());
        const resumeData = await extractResumeData(resumeBuffer, resume.name);

        // 2. Create Talent Profile (Hiring Pipeline)
        const { TalentPoolService } = await import("../services/talentPoolService");
        const profile = await TalentPoolService.add(tenantId, {
            source: 'applied',
            sourceDetail: 'Public Job Portal',
            candidate: {
                name: name,
                email: email,
                skills: resumeData.skills,
                experienceYears: resumeData.totalIndustrialExperienceYears,
                currentRole: resumeData.experience?.[0]?.title || "Candidate",
                currentCompany: resumeData.experience?.[0]?.company || "Unknown",
            },
            tags: ['external_application'],
            notes: [],
            pipeline: {
                currentStage: 'Applied',
                requisitionId: new ObjectId(jobId),
                lastActivity: new Date()
            },
            nurture: { enrolled: false },
            gdprConsent: { given: true, date: new Date(), channel: 'WEB_FORM' }
        }, "PUBLIC_PORTAL");

        const applicationId = profile._id?.toString() || "unknown";

        // 3. Generate Magic Link
        const token = generateMagicLinkToken({
            email,
            candidateId: applicationId,
            tenantId,
            jobId,
            type: "MAGIC_LINK"
        });

        const magicLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/status/${token}`;

        // 4. Send Confirmation Email with Magic Link
        await NotificationService.dispatch({
            tenantId,
            recipientEmail: email,
            title: `Application Received: ${resumeData.name}`,
            message: `Hi ${name}, thank you for applying! You can track your real-time application status here: ${magicLink}`,
            channels: ["EMAIL"]
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Application submitted successfully",
            applicationId,
            magicLinkToken: token 
        }), { status: 201 });

    } catch (error) {
        console.error("[PublicApply] Error:", error);
        return new Response(JSON.stringify({ success: false, error: "Application failed" }), { status: 500 });
    }
}

/**
 * Fetch application status via Magic Link Token
 */
export async function getApplicationStatusHandler(req: Request): Promise<Response> {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get("token");

        if (!token) {
            return new Response(JSON.stringify({ success: false, error: "Missing token" }), { status: 400 });
        }

        const payload = verifyMagicLinkToken(token);
        if (!payload) {
            return new Response(JSON.stringify({ success: false, error: "Invalid or expired magic link" }), { status: 401 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        const application = await db.collection('applications').findOne({ 
            _id: new ObjectId(payload.candidateId),
            tenantId: payload.tenantId 
        });

        if (!application) {
            return new Response(JSON.stringify({ success: false, error: "Application not found" }), { status: 404 });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            application: {
                name: application.name,
                jobTitle: "Open Position", // Should join with jobs table in production
                status: application.status,
                stage: application.stage,
                appliedAt: application.createdAt
            }
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch status" }), { status: 500 });
    }
}
