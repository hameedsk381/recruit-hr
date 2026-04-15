import { describe, expect, it, beforeAll } from "bun:test";
import "../setup";
import { getMongoDb } from "../../utils/mongoClient";
import { generateToken } from "../../utils/auth";
import { listInterviewsHandler, scheduleInterviewHandler } from "../../routes/interviews";
import { AuthContext } from "../../middleware/authMiddleware";
import { ObjectId } from "mongodb";

/**
 * PRODUCTION READINESS: Integration Test
 * Validates strict multi-tenant isolation at the route level.
 */
describe("Enterprise Tenant Isolation", () => {
    let db: any;
    
    const TENANT_A = "enterprise_a";
    const TENANT_B = "enterprise_b";
    
    const CONTEXT_A: AuthContext = {
        userId: "user_a",
        tenantId: TENANT_A,
        email: "admin@enterprise_a.com",
        roles: ["ADMIN"]
    };

    const CONTEXT_B: AuthContext = {
        userId: "user_b",
        tenantId: TENANT_B,
        email: "admin@enterprise_b.com",
        roles: ["ADMIN"]
    };

    beforeAll(async () => {
        db = getMongoDb();
        // Seed some data
        if (db) {
            await db.collection('interviews').deleteMany({});
            await db.collection('interviews').insertMany([
                { tenantId: TENANT_A, candidateName: "Alice", type: "Technical" },
                { tenantId: TENANT_A, candidateName: "Bob", type: "Cultural" },
                { tenantId: TENANT_B, candidateName: "Charlie", type: "Executive" }
            ]);
        }
    });

    it("should only return interviews belonging to the authenticated tenant (Tenant A)", async () => {
        const req = new Request("http://localhost/interviews");
        const res = await listInterviewsHandler(req, CONTEXT_A);
        const data = await res.json();

        expect(data.success).toBe(true);
        expect(data.interviews).toHaveLength(2);
        expect(data.interviews.every((i: any) => i.tenantId === TENANT_A)).toBe(true);
        expect(data.interviews.some((i: any) => i.candidateName === "Charlie")).toBe(false);
    });

    it("should return empty list if tenant has no data, even if other tenants do", async () => {
        const CONTEXT_C: AuthContext = {
            userId: "user_c",
            tenantId: "empty_tenant",
            email: "admin@empty.com",
            roles: ["ADMIN"]
        };

        const req = new Request("http://localhost/interviews");
        const res = await listInterviewsHandler(req, CONTEXT_C);
        const data = await res.json();

        expect(data.success).toBe(true);
        expect(data.interviews).toHaveLength(0);
    });

    it("should prevent unauthorized cross-tenant operations (scheduling for wrong tenant)", async () => {
        // This is a logic check: although the handler takes context.tenantId from the token,
        // we verify the database layer correctly honors it.
        const req = new Request("http://localhost/interviews/schedule", {
            method: "POST",
            body: JSON.stringify({
                candidateId: new ObjectId().toString(),
                candidateName: "Hacker Candidate",
                candidateEmail: "hacker@test.com",
                jobId: new ObjectId().toString(),
                jobTitle: "Software Engineer",
                startTime: new Date().toISOString(),
                tenantId: TENANT_A // Attempting to inject TENANT_A into TENANT_B's session
            })
        });

        const res = await scheduleInterviewHandler(req, CONTEXT_B);
        const data = await res.json();

        expect(data.success).toBe(true);
        expect(data.interview.tenantId).toBe(TENANT_B);
        expect(data.interview.tenantId).not.toBe(TENANT_A);
    });
});
