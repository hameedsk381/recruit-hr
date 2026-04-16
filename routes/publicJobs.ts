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

        const jobs = await db.collection('jobs')
            .find({ tenantId, status: "published", isPublic: true })
            .project({
                title: 1,
                company: 1,
                location: 1,
                employmentType: 1,
                description: 1,
                createdAt: 1,
                slug: 1
            })
            .sort({ createdAt: -1 })
            .toArray();

        return new Response(JSON.stringify({ success: true, jobs }), { 
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
