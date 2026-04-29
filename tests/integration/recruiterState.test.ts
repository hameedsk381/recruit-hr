import { beforeAll, describe, expect, it } from "bun:test";
import "../setup";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../utils/mongoClient";
import { updateCandidateHandler } from "../../routes/recruiterState";
import type { AuthContext } from "../../middleware/authMiddleware";

describe("Recruiter State Updates", () => {
    const tenantId = "state_test_tenant";
    const userId = "state_test_user";
    const batchId = "batch-state-test";
    const candidateId = "candidate-123";

    const context: AuthContext = {
        isAuthenticated: true,
        tenantId,
        userId,
        email: "recruiter@test.com",
        roles: ["recruiter"]
    };

    beforeAll(async () => {
        const db = getMongoDb();
        await db.collection("assessment_batches").deleteMany({ batchId });
        await db.collection("assessment_batches").insertOne({
            _id: new ObjectId(),
            batchId,
            tenantId,
            userId,
            results: [
                {
                    resumeName: candidateId,
                    matchResult: { Id: candidateId, resumeName: candidateId },
                    stage: "applied",
                    removed: false
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });

    it("updates a known candidate", async () => {
        const req = new Request("http://localhost/recruiter/update-candidate", {
            method: "POST",
            body: JSON.stringify({
                batchId,
                candidateId,
                stage: "shortlisted"
            })
        });

        const res = await updateCandidateHandler(req, context);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("returns 404 when the candidate does not exist", async () => {
        const req = new Request("http://localhost/recruiter/update-candidate", {
            method: "POST",
            body: JSON.stringify({
                batchId,
                candidateId: "missing-candidate",
                stage: "shortlisted"
            })
        });

        const res = await updateCandidateHandler(req, context);
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.success).toBe(false);
    });
});
