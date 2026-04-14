import { getMongoDb } from '../utils/mongoClient';

export interface ROIMetrics {
    totalResumesProcessed: number;
    hoursSaved: number;
    costSavingsINR: number;
    screeningEfficiencyGain: string; // Percentage improvement
    topPerformedJobs: Array<{ title: string, count: number, savings: number }>;
}

/**
 * ROI Analytics Service
 * 
 * Specifically designed for the Indian B2B market to prove commercial value
 * by translating technical processing into hard currency and hour savings.
 */
const BATCH_COLLECTION = 'assessment_batches';

export class ROIAnalyticsService {
    // Commercial Constants for Indian Market
    private static readonly MANUAL_SCREENING_TIME_MINS = 5; 
    private static readonly RECRUITER_HOURLY_RATE_INR = 600; 

    /**
     * Calculate global ROI metrics for a specific tenant using unified Batch schema
     */
    static async getTenantROI(tenantId: string): Promise<ROIMetrics> {
        const db = getMongoDb();
        if (!db) throw new Error("Database unavailable");

        // Aggregate completedJobs across all tenant batches
        const results = await db.collection(BATCH_COLLECTION).aggregate([
            { $match: { tenantId } },
            { 
                $group: { 
                    _id: null, 
                    totalCandidates: { $sum: "$completedJobs" } 
                } 
            }
        ]).toArray();

        const processedCount = results.length > 0 ? results[0].totalCandidates : 0;

        // ROI Calculations
        const totalMinutesSaved = processedCount * this.MANUAL_SCREENING_TIME_MINS;
        const totalHoursSaved = Math.round((totalMinutesSaved / 60) * 10) / 10;
        const totalCostSaved = Math.round(totalHoursSaved * this.RECRUITER_HOURLY_RATE_INR);

        return {
            totalResumesProcessed: processedCount,
            hoursSaved: totalHoursSaved,
            costSavingsINR: totalCostSaved,
            screeningEfficiencyGain: "98%",
            topPerformedJobs: [] 
        };
    }

    /**
     * Aggregates savings per Job Title to show which roles are most "expensive" to hire manually.
     */
    static async getJOBSavingsBreakdown(tenantId: string) {
        const db = getMongoDb();
        if (!db) return [];

        const results = await db.collection(BATCH_COLLECTION).aggregate([
            { $match: { tenantId } },
            {
                $group: {
                    _id: "$jobData.title",
                    totalProcessed: { $sum: "$completedJobs" }
                }
            },
            { $sort: { totalProcessed: -1 } as const },
            { $limit: 5 }
        ]).toArray();
        
        return results.map(item => {
            const hours = Math.round((item.totalProcessed * this.MANUAL_SCREENING_TIME_MINS / 60) * 10) / 10;
            return {
                title: item._id || "General Ingestion",
                candidateCount: item.totalProcessed,
                hoursSaved: hours,
                inrSaved: hours * this.RECRUITER_HOURLY_RATE_INR
            };
        });
    }
}
