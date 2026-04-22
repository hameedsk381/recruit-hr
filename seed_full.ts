import { initializeMongoClient, getMongoDb, closeMongoConnection } from "./utils/mongoClient";
import { ObjectId } from "mongodb";

async function seedFull() {
    try {
        await initializeMongoClient();
        const db = getMongoDb();
        console.log("Starting comprehensive database seeding...");

        const tenantId = "reckruit-demo";
        const userId = "admin-id";

        // 1. Tenants
        await db.collection("tenants").updateOne(
            { tenantId },
            { 
                $set: { 
                    name: "Acme Global Corp", 
                    industry: "Technology",
                    onboardingStatus: "completed",
                    createdAt: new Date() 
                } 
            },
            { upsert: true }
        );

        // 2. Requisitions (Published Roles)
        const requisitions = [
            {
                _id: new ObjectId("65f1a2b3c4d5e6f7a8b9c001"),
                tenantId,
                title: "Senior AI Engineer",
                department: "Engineering",
                location: "San Francisco, CA",
                headcount: 2,
                budgetBand: { min: 180000, max: 250000, currency: "USD" },
                justification: "Scaling our generative AI platform.",
                status: "published",
                hiringManagerId: userId,
                targetHireDate: new Date("2026-08-01"),
                createdAt: new Date(),
                updatedAt: new Date(),
                description: "We are looking for a Senior AI Engineer to lead our LLM orchestration team. You will work on building scalable agentic workflows and fine-tuning models for HR-specific tasks.",
                skills: ["Python", "PyTorch", "LLMs", "LangChain", "Kubernetes"]
            },
            {
                _id: new ObjectId("65f1a2b3c4d5e6f7a8b9c002"),
                tenantId,
                title: "Full Stack Developer",
                department: "Product",
                location: "Remote (India)",
                headcount: 3,
                budgetBand: { min: 2500000, max: 4000000, currency: "INR" },
                justification: "Building the next-gen recruiter dashboard.",
                status: "published",
                hiringManagerId: userId,
                targetHireDate: new Date("2026-07-15"),
                createdAt: new Date(),
                updatedAt: new Date(),
                description: "Join our product team to build beautiful, responsive interfaces using React and Bun. You should have experience with high-performance real-time applications.",
                skills: ["React", "TypeScript", "Bun", "Tailwind", "PostgreSQL"]
            },
            {
                _id: new ObjectId("65f1a2b3c4d5e6f7a8b9c003"),
                tenantId,
                title: "Talent Acquisition Manager",
                department: "HR",
                location: "London, UK",
                headcount: 1,
                budgetBand: { min: 60000, max: 85000, currency: "GBP" },
                justification: "Driving our European expansion hiring strategy.",
                status: "published",
                hiringManagerId: userId,
                targetHireDate: new Date("2026-09-01"),
                createdAt: new Date(),
                updatedAt: new Date(),
                description: "We need a strategic TA Manager to lead our hiring efforts in EMEA. You will be responsible for sourcing top-tier talent and managing our agency partners.",
                skills: ["Sourcing", "Stakeholder Management", "ATS", "Employer Branding"]
            }
        ];

        for (const req of requisitions) {
            await db.collection("requisitions").updateOne({ _id: req._id }, { $set: req }, { upsert: true });
        }

        // 3. Talent Profiles (Candidates)
        const candidates = [
            {
                tenantId,
                candidate: { name: "Sarah Johnson", email: "sarah.j@example.com", phone: "+1 415 555 0123" },
                source: "referral",
                pipeline: { 
                    currentStage: "interview", 
                    requisitionId: requisitions[0]._id,
                    lastActivity: new Date()
                },
                tags: ["top-talent", "ai-expert"],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                tenantId,
                candidate: { name: "Arjun Mehta", email: "arjun.m@example.com", phone: "+91 98765 43210" },
                source: "applied",
                pipeline: { 
                    currentStage: "shortlisted", 
                    requisitionId: requisitions[1]._id,
                    lastActivity: new Date()
                },
                tags: ["frontend-pro"],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                tenantId,
                candidate: { name: "Emily Smith", email: "emily.s@example.com", phone: "+44 20 7946 0000" },
                source: "linkedin",
                pipeline: { 
                    currentStage: "applied", 
                    requisitionId: requisitions[2]._id,
                    lastActivity: new Date()
                },
                tags: ["experienced-hr"],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        for (const cand of candidates) {
            await db.collection("talent_profiles").updateOne(
                { tenantId, "candidate.email": cand.candidate.email }, 
                { $set: cand }, 
                { upsert: true }
            );
        }

        // 4. Assessment Batches (Dashboard Activity)
        const batches = [
            {
                batchId: "batch-001",
                tenantId,
                userId,
                status: "COMPLETED",
                totalJobs: 12,
                completedJobs: 12,
                failedJobs: 0,
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                jobData: { title: "Software Engineer", company: "Acme Corp" }
            },
            {
                batchId: "batch-002",
                tenantId,
                userId,
                status: "COMPLETED",
                totalJobs: 5,
                completedJobs: 5,
                failedJobs: 0,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                jobData: { title: "Product Designer", company: "Acme Corp" }
            }
        ];

        for (const batch of batches) {
            await db.collection("assessment_batches").updateOne({ batchId: batch.batchId }, { $set: batch }, { upsert: true });
        }

        // 5. External Job Postings
        const postings = [
            {
                tenantId,
                requisitionId: requisitions[0]._id,
                platform: "linkedin",
                postingId: "LI-9921",
                url: "https://linkedin.com/jobs/9921",
                status: "active",
                metrics: { views: 1240, applications: 45, lastSyncedAt: new Date() },
                publishedAt: new Date()
            },
            {
                tenantId,
                requisitionId: requisitions[1]._id,
                platform: "indeed",
                postingId: "ID-8832",
                url: "https://indeed.com/jobs/8832",
                status: "active",
                metrics: { views: 850, applications: 22, lastSyncedAt: new Date() },
                publishedAt: new Date()
            }
        ];

        for (const post of postings) {
            await db.collection("job_postings").updateOne(
                { tenantId, platform: post.platform, requisitionId: post.requisitionId }, 
                { $set: post }, 
                { upsert: true }
            );
        }

        console.log("Seeding completed successfully!");

    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        await closeMongoConnection();
    }
}

seedFull();
