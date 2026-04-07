import { getMongoDb } from '../utils/mongoClient';
import { logger } from '../utils/logger';

export interface DashboardStats {
    totalResumesProcessed: number;
    totalJobDescriptionsAnalyzed: number;
    averageAssessmentTimeMs: number;
    highMatchRate: number; // % of candidates with > 80 score
    topSkillsRequested: { skill: string; count: number }[];
    recentBatchTrends: { date: string; count: number }[];

    // New Interview Analytics
    interviewStatusBreakdown: { status: string; count: number }[];

    // New Scorecard Analytics
    hiringRecommendations: { type: string; count: number }[];
    averageCategoryScores: { category: string; average: number }[];
}

const BATCH_COLLECTION = 'assessment_batches';
const INTERVIEW_COLLECTION = 'interviews';
const SCORECARD_COLLECTION = 'scorecards';

export class KpiService {
    /**
     * Get recruitment performance KPIs for a tenant
     */
    static async getTenantKpis(tenantId: string): Promise<DashboardStats> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        // 1. Basic counts from batches
        const totalBatches = await db.collection(BATCH_COLLECTION).find({ tenantId }).toArray();
        const totalResumes = totalBatches.reduce((acc: number, b: any) => acc + (b.totalJobs || 0), 0);

        // 2. Performance: Average Time-to-Assess
        let totalTimeMs = 0;
        let completedBatchCount = 0;
        let highMatchCount = 0;
        let assessedCandidateCount = 0;

        totalBatches.forEach((batch: any) => {
            if (batch.status === 'COMPLETED' && batch.updatedAt && batch.createdAt) {
                totalTimeMs += (new Date(batch.updatedAt).getTime() - new Date(batch.createdAt).getTime());
                completedBatchCount++;
            }

            if (batch.results && Array.isArray(batch.results)) {
                batch.results.forEach((res: any) => {
                    assessedCandidateCount++;
                    const score = res.matchResult?.matchScore || 0;
                    if (score >= 80) highMatchCount++;
                });
            }
        });

        const highMatchRate = assessedCandidateCount > 0
            ? Math.round((highMatchCount / assessedCandidateCount) * 100)
            : 0;

        const averageAssessmentTimeMs = completedBatchCount > 0
            ? Math.round(totalTimeMs / completedBatchCount)
            : 0;

        // 3. Interview status breakdown
        const interviews = await db.collection(INTERVIEW_COLLECTION).find({ tenantId }).toArray();
        const interviewMap: Record<string, number> = { scheduled: 0, completed: 0, cancelled: 0, pending: 0 };
        interviews.forEach((i: any) => {
            if (interviewMap[i.status] !== undefined) interviewMap[i.status]++;
        });

        // 4. Scorecard Analytics
        // Filter scorecards by fetching all interviews of the tenant first
        const interviewIds = interviews.map((i: any) => i.id);
        const tenantScorecards = await db.collection(SCORECARD_COLLECTION).find({ interviewId: { $in: interviewIds } }).toArray();

        const recoMap: Record<string, number> = { strong_hire: 0, hire: 0, no_hire: 0, strong_no_hire: 0 };
        const categorySums: Record<string, { total: number, count: number }> = {};

        tenantScorecards.forEach((sc: any) => {
            if (recoMap[sc.recommendation] !== undefined) recoMap[sc.recommendation]++;

            sc.ratings?.forEach((r: any) => {
                if (!categorySums[r.category]) categorySums[r.category] = { total: 0, count: 0 };
                categorySums[r.category].total += r.score;
                categorySums[r.category].count++;
            });
        });

        // 5. Trends (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentBatches = totalBatches.filter((b: any) => b.createdAt >= sevenDaysAgo);
        const trends = this.calculateDailyTrends(recentBatches);

        return {
            totalResumesProcessed: totalResumes,
            totalJobDescriptionsAnalyzed: totalBatches.length,
            averageAssessmentTimeMs,
            highMatchRate,
            topSkillsRequested: [],
            recentBatchTrends: trends,
            interviewStatusBreakdown: Object.entries(interviewMap).map(([status, count]) => ({ status, count })),
            hiringRecommendations: Object.entries(recoMap).map(([type, count]) => ({ type, count })),
            averageCategoryScores: Object.entries(categorySums).map(([category, data]) => ({
                category,
                average: Math.round((data.total / data.count) * 10) / 10
            }))
        };
    }

    private static calculateDailyTrends(batches: any[]): { date: string; count: number }[] {
        const daily: Record<string, number> = {};
        batches.forEach((b: any) => {
            const dateStr = new Date(b.createdAt).toISOString().split('T')[0];
            daily[dateStr] = (daily[dateStr] || 0) + (b.totalJobs || 1);
        });

        return Object.entries(daily)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
}

