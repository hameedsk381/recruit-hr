import { getMongoDb } from "../utils/mongoClient";
import { AuthContext } from "../middleware/authMiddleware";
import { ObjectId } from "mongodb";

/**
 * [PUBLIC] Fetch all published jobs for a tenant
 */
export async function getPublicJobsHandler(req: Request): Promise<Response> {
    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get("tenantId");

        if (!tenantId) {
            return new Response(JSON.stringify({ success: false, error: "Missing tenantId" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        const jobs = await db.collection('requisitions')
            .find({ tenantId, status: "published" })
            .project({
                _id: 1,
                title: 1,
                company: 1,
                location: 1,
                employmentType: 1,
                description: 1,
                justification: 1,
                createdAt: 1
            })
            .sort({ createdAt: -1 })
            .toArray();

        // Map _id to id for frontend
        const mappedJobs = jobs.map(j => ({
            ...j,
            id: j._id.toString(),
            description: j.description || j.justification || "Exciting role at a growing company."
        }));

        return new Response(JSON.stringify({ success: true, jobs: mappedJobs }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch public jobs" }), { status: 500 });
    }
}

/**
 * [ADMIN/RECRUITER] Publish a job description to the public portal
 */
export async function publishJobHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const body = await req.json();
        const { jdId, isPublic, customSlug } = body;

        if (!jdId) {
            return new Response(JSON.stringify({ success: false, error: "Missing Job Description ID" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // Generate slug if not provided
        const slug = customSlug || `job-${jdId.slice(-6)}`;

        await db.collection('jobs').updateOne(
            { _id: new ObjectId(jdId), tenantId: context.tenantId },
            { 
                $set: { 
                    status: "published", 
                    isPublic: isPublic !== false, 
                    slug,
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Job published successfully",
            publicUrl: `/jobs/${context.tenantId}/${slug}`
        }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to publish job" }), { status: 500 });
    }
}

/**
 * [PUBLIC] Fetch a single job by its public ID/slug
 */
export async function getPublicJobBySlugHandler(req: Request): Promise<Response> {
    try {
        const url = new URL(req.url);
        const publicId = url.pathname.split('/').pop();

        if (!publicId) {
            return new Response(JSON.stringify({ success: false, error: "Missing job slug" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        const job = await db.collection('requisitions').findOne({ publicId, status: 'published' });

        if (!job) {
            return new Response(JSON.stringify({ success: false, error: "Job not found" }), { status: 404 });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            job: {
                id: job._id.toString(),
                tenantId: job.tenantId,
                title: job.title,
                department: job.department,
                location: job.location,
                description: job.description || job.justification,
                budgetBand: job.budgetBand,
                createdAt: job.createdAt
            } 
        }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch job details" }), { status: 500 });
    }
}
