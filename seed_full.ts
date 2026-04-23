import { initializeMongoClient, getMongoDb, closeMongoConnection } from "./utils/mongoClient";
import { ObjectId } from "mongodb";

async function seedFull() {
    try {
        await initializeMongoClient();
        const db = getMongoDb();
        console.log("Seeding Sourcing, Referrals, and Offers...");

        const targetTenants = ["reckruit-demo", "tenant-default-001"];
        const userId = "admin-id";

        for (const tenantId of targetTenants) {
            console.log(`Seeding for tenant: ${tenantId}`);

            const req = await db.collection("requisitions").findOne({ tenantId });
            const reqId = req?._id;

            // 1. Outbound Sourcing (Passive Candidates)
            const sourcedCandidates = [
                {
                    tenantId,
                    userId,
                    source: 'chrome_extension',
                    externalUrl: 'https://www.linkedin.com/in/johndoe-pro',
                    candidate: { 
                        name: 'John Doe', 
                        email: 'john.doe@example.com',
                        currentRole: 'Principal Engineer',
                        currentCompany: 'Tech Giants Inc',
                        location: 'San Jose, CA',
                        skills: ['Node.js', 'System Design', 'Cloud Architecture']
                    },
                    status: 'sourced',
                    ingestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
                },
                {
                    tenantId,
                    userId,
                    source: 'github_scanner',
                    externalUrl: 'https://github.com/coder-jane',
                    candidate: { 
                        name: 'Jane Coder', 
                        email: 'jane.coder@example.com',
                        currentRole: 'Senior Backend Engineer',
                        currentCompany: 'OpenSource Labs',
                        location: 'Berlin, Germany',
                        skills: ['Go', 'Rust', 'Docker', 'Kubernetes']
                    },
                    status: 'sourced',
                    ingestedAt: new Date()
                }
            ];

            for (const sc of sourcedCandidates) {
                // Add to talent_profiles as sourced
                await db.collection('talent_profiles').updateOne(
                    { tenantId, 'candidate.email': sc.candidate.email },
                    { 
                        $set: { 
                            ...sc,
                            pipeline: { currentStage: 'sourced', lastActivity: new Date() },
                            tags: ['sourced', 'chrome-extension'],
                            notes: []
                        } 
                    },
                    { upsert: true }
                );
            }

            // 2. Referrals
            const referrals = [
                {
                    tenantId,
                    referrerId: 'employee-123',
                    candidateName: 'Michael Scott',
                    candidateEmail: 'michael.s@dundermifflin.com',
                    candidatePhone: '+1 555 123 4567',
                    requisitionId: reqId,
                    status: 'shortlisted',
                    notes: 'Great sales background, highly recommended by the Regional Manager.',
                    bonus: { amount: 2000, currency: 'USD' },
                    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date()
                },
                {
                    tenantId,
                    referrerId: 'employee-456',
                    candidateName: 'Pam Beesly',
                    candidateEmail: 'pam.b@example.com',
                    requisitionId: reqId,
                    status: 'submitted',
                    notes: 'Strong operations and admin experience.',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            for (const ref of referrals) {
                await db.collection('referrals').updateOne(
                    { tenantId, candidateEmail: ref.candidateEmail },
                    { $set: ref },
                    { upsert: true }
                );

                // Also add to talent_profiles as referred
                await db.collection('talent_profiles').updateOne(
                    { tenantId, 'candidate.email': ref.candidateEmail },
                    {
                        $setOnInsert: {
                            tenantId,
                            source: 'referred',
                            sourceDetail: `referral:${ref.referrerId}`,
                            candidate: { name: ref.candidateName, email: ref.candidateEmail, phone: ref.candidatePhone },
                            tags: ['referred'],
                            notes: [],
                            pipeline: {
                                currentStage: 'applied',
                                requisitionId: reqId,
                                lastActivity: new Date(),
                            },
                            nurture: { enrolled: false },
                            gdprConsent: { given: false, date: new Date(), channel: 'referral' },
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    },
                    { upsert: true }
                );
            }

            // 3. Detailed Offers
            const candidates = await db.collection('talent_profiles').find({ tenantId, tags: 'ai-expert' }).toArray();
            const candId = candidates[0]?._id;

            if (candId) {
                const offers = [
                    {
                        tenantId,
                        candidateId: candId,
                        jobId: reqId, // Using reqId as jobId for simplicity in demo
                        requisitionId: reqId,
                        compensation: { 
                            base: 225000, 
                            currency: 'USD', 
                            bonus: 25000, 
                            equity: '5000 RSUs',
                            benefits: ['Health Insurance', '401k Match', 'Learning Stipend']
                        },
                        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        status: 'pending_approval',
                        approvalChain: [
                            { approverRole: 'Finance', status: 'approved', decidedAt: new Date() },
                            { approverRole: 'VP Engineering', status: 'pending' }
                        ],
                        createdBy: userId,
                        createdAt: new Date()
                    }
                ];

                for (const offer of offers) {
                    await db.collection('offers').updateOne(
                        { tenantId, candidateId: candId, status: offer.status },
                        { $set: offer },
                        { upsert: true }
                    );
                }
            }
        }

        console.log("Seeding completed successfully!");

    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        await closeMongoConnection();
    }
}

seedFull();
