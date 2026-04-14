import { getMongoDb } from '../utils/mongoClient';
import { ObjectId } from 'mongodb';

export class PrivacyService {
    
    /**
     * Right to be Forgotten (GDPR Article 17)
     * Fully deletes the candidate's profile and scrubs PII from the audit logs,
     * maintaining statistical history but removing identifiability.
     */
    static async deleteCandidateData(candidateId: string): Promise<boolean> {
        const db = getMongoDb();
        if (!db) {
            console.error('[PrivacyService] Database not available');
            throw new Error('Database unavailable');
        }

        try {
            const objectId = new ObjectId(candidateId);

            // 1. Delete the raw candidate profile & resume extractions
            await db.collection('candidates').deleteOne({ _id: objectId });

            // 2. Anonymize specific Candidate metrics in the Data Warehouse/Audit Logs
            // We update rather than delete so the company doesn't lose historical KPI/throughput data.
            await db.collection('audit_logs').updateMany(
                { "details.candidateId": candidateId },
                { 
                    $set: { 
                        "details.candidateName": "[REDACTED_GDPR]", 
                        "details.candidateEmail": "[REDACTED_GDPR]",
                        "details.candidatePhone": "[REDACTED_GDPR]"
                    } 
                }
            );

            // 3. Clear any scorecards or interview records
            await db.collection('scorecards').deleteMany({ candidateId: candidateId });
            await db.collection('interviews').deleteMany({ candidateId: candidateId });

            console.log(`[PrivacyService] Successfully wiped PII for candidate ${candidateId}`);
            return true;

        } catch (error) {
            console.error(`[PrivacyService] Error deleting candidate ${candidateId}:`, error);
            throw error;
        }
    }

    /**
     * Data Minimization & Retention Policy (GDPR Article 5)
     * Bulk deletes candidates who have not been active for the minimum retention period.
     */
    static async enforceDataRetention(monthsRetained = 6): Promise<number> {
        const db = getMongoDb();
        if (!db) return 0;

        try {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - monthsRetained);

            // Find candidates whose "lastActivity" or "createdAt" is older than the cutoff
            const oldCandidates = await db.collection('candidates')
                .find({ lastActivity: { $lt: cutoffDate } }, { projection: { _id: 1 } })
                .toArray();

            let scrubbedCount = 0;
            for (const candidate of oldCandidates) {
                await this.deleteCandidateData(candidate._id.toString());
                scrubbedCount++;
            }

            console.log(`[PrivacyService] Enforced Retention Policy. Deleted ${scrubbedCount} old profiles.`);
            return scrubbedCount;

        } catch (error) {
            console.error('[PrivacyService] Failed to enforce retention policy:', error);
            return 0;
        }
    }

    /**
     * Consent Verification (GDPR Article 13/14)
     * Throws an error if the user explicitly opted out of AI processing.
     */
    static async verifyAIConsent(candidateId: string): Promise<boolean> {
        const db = getMongoDb();
        if (!db) return false;

        try {
            const candidate = await db.collection('candidates').findOne({ _id: new ObjectId(candidateId) });
            if (!candidate) throw new Error("Candidate not found");
            
            // If they explicitly un-ticked the AI consent box, throw to prevent routing.
            if (candidate.ai_processing_opt_in === false) {
                throw new Error("GDPR_REJECT: Candidate has opted out of Automated Processing.");
            }

            return true;
        } catch(error) {
            console.error(`[PrivacyService] Consent verification failed:`, error);
            throw error; // Let the router catch it and fail gracefully
        }
    }
}
