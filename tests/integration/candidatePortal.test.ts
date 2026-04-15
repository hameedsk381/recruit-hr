import { describe, expect, it, beforeAll } from "bun:test";
import "../setup";
import { getMongoDb } from "../../utils/mongoClient";
import { publicApplyHandler, getApplicationStatusHandler } from "../../routes/candidatePortal";
import { verifyMagicLinkToken } from "../../utils/magicLink";
import { ObjectId } from "mongodb";

/**
 * PRODUCTION READINESS: Integration Test
 * Validates the Sovereign Candidate Journey end-to-end.
 */
describe("Sovereign Candidate Journey", () => {
    let db: any;
    const TEST_TENANT = "test_enterprise";
    const TEST_JOB_ID = new ObjectId().toString();

    beforeAll(async () => {
        db = getMongoDb();
        if (db) {
            await db.collection('applications').deleteMany({ tenantId: TEST_TENANT });
        }
    });

    it("should process a public application and return a magic link token", async () => {
        // Mock FormData for application
        const formData = new FormData();
        formData.append("name", "Test Candidate");
        formData.append("email", "test@candidate.com");
        formData.append("jobId", TEST_JOB_ID);
        formData.append("tenantId", TEST_TENANT);
        
        // Mock a small file
        const resumeFile = new Blob(["test resume content"], { type: "text/plain" });
        formData.append("resume", resumeFile, "resume.txt");

        const req = new Request("http://localhost/public/apply", {
            method: "POST",
            body: formData
        });

        const res = await publicApplyHandler(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.magicLinkToken).toBeDefined();

        // Verify token validity
        const payload = verifyMagicLinkToken(data.magicLinkToken);
        expect(payload?.email).toBe("test@candidate.com");
        expect(payload?.tenantId).toBe(TEST_TENANT);
    });

    it("should allow a candidate to track their status using a magic link token", async () => {
        // First, manually seed an application to get a valid token
        const appId = new ObjectId();
        await db.collection('applications').insertOne({
            _id: appId,
            tenantId: TEST_TENANT,
            jobId: TEST_JOB_ID,
            name: "Status Tester",
            email: "status@test.com",
            status: "screened",
            stage: "Technical Screening",
            createdAt: new Date()
        });

        const { generateMagicLinkToken } = await import("../../utils/magicLink");
        const token = generateMagicLinkToken({
            email: "status@test.com",
            candidateId: appId.toString(),
            tenantId: TEST_TENANT,
            jobId: TEST_JOB_ID,
            type: "MAGIC_LINK"
        });

        const req = new Request(`http://localhost/public/track?token=${token}`);
        const res = await getApplicationStatusHandler(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.application.name).toBe("Status Tester");
        expect(data.application.stage).toBe("Technical Screening");
    });

    it("should reject invalid or expired magic link tokens", async () => {
        const invalidToken = "this.is.not.a.token";
        const req = new Request(`http://localhost/public/track?token=${invalidToken}`);
        const res = await getApplicationStatusHandler(req);
        
        expect(res.status).toBe(401);
    });
});
