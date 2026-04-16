import { getMongoDb } from "../utils/mongoClient";

export class ComplianceService {
    
    static async generateEEOReport(tenantId: string) {
        const db = getMongoDb();
        
        // In a real app, this would aggregate from the `candidates` collection 
        // where EEO data is stored (usually anonymized and separated).
        const pipeline = [
            { $match: { tenantId, eeoOptIn: true } },
            { $group: { 
                _id: "$gender", 
                count: { $sum: 1 },
                byEthnicity: { $push: "$ethnicity" }
            }}
        ];

        const stats = await db.collection('candidates').aggregate(pipeline).toArray();
        
        return {
            reportType: 'EEO-1 Anonymized Aggregate',
            generatedAt: new Date(),
            data: stats
        };
    }

    static async handleGdprDeletionRequest(tenantId: string, candidateEmail: string) {
        const db = getMongoDb();
        
        console.log(`[Compliance] Hard-deleting PII for ${candidateEmail} under GDPR mandate.`);

        // 1. Delete candidate profile
        await db.collection('candidates').deleteOne({ email: candidateEmail, tenantId });
        
        // 2. Delete linked applications
        await db.collection('applications').deleteMany({ candidateEmail, tenantId });

        // 3. Log the deletion to audit (sanitized)
        await db.collection('audit_logs').insertOne({
            tenantId,
            action: 'GDPR_PURGE',
            timestamp: new Date(),
            details: `Candidate self-service purge completed for anonymized hash.`
        });

        return { success: true, message: "PII purged successfully" };
    }
}
