import { getMongoDb } from "../utils/mongoClient";
import { generateMagicLinkToken, verifyMagicLinkToken } from "../utils/magicLink";
import { NotificationService } from "../services/notificationService";
import { ObjectId } from "mongodb";

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

        // 1. Create Candidate Entry in a specific 'applications' collection for the portal
        const application = await db.collection('applications').insertOne({
            tenantId,
            jobId,
            name,
            email,
            resumeName: resume.name,
            status: "applied",
            stage: "Applied",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const applicationId = application.insertedId.toString();

        // 2. Generate Magic Link
        const token = generateMagicLinkToken({
            email,
            candidateId: applicationId,
            tenantId,
            jobId,
            type: "MAGIC_LINK"
        });

        const magicLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/status/${token}`;

        // 3. Send Confirmation Email with Magic Link
        await NotificationService.dispatch({
            tenantId,
            recipientEmail: email,
            title: "Application Received - Track your progress",
            message: `Hi ${name}, thank you for applying! You can track your real-time application status here: ${magicLink}`,
            channels: ["EMAIL"]
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Application submitted successfully",
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
