import type { ShortlistCandidate } from "../types";

export interface PipelineStats {
    totalCandidates: number;
    staleCandidates: number; // No movement in 48h
    bottleneckStage: string; // Stage where most candidates are stuck
    velocityScore: number; // 0-100 score of how fast candidates move
    balanceScore: number; // 0-100 score of tier distribution (High vs Low)
}

export class PipelineHealthService {
    static analyze(candidates: ShortlistCandidate[]): PipelineStats {
        const stale = candidates.filter(c => {
            if (!c.stageChangedAt) return false;
            const changedAt = new Date(c.stageChangedAt);
            const hoursSinceChange = (Date.now() - changedAt.getTime()) / (1000 * 60 * 60);
            return hoursSinceChange > 48;
        }).length;

        // Stage counts
        const stageCounts: Record<string, number> = {};
        candidates.forEach(c => {
            const stage = c.stage || 'applied';
            stageCounts[stage] = (stageCounts[stage] || 0) + 1;
        });

        let bottleneck = 'applied';
        let maxCount = 0;
        for (const [stage, count] of Object.entries(stageCounts)) {
            if (count > maxCount) {
                maxCount = count;
                bottleneck = stage;
            }
        }

        // Tier distribution
        const highFit = candidates.filter(c => c.assessment.fit_assessment.overall_fit === 'high').length;
        const balanceScore = Math.min(100, Math.round((highFit / Math.max(1, candidates.length)) * 200));

        return {
            totalCandidates: candidates.length,
            staleCandidates: stale,
            bottleneckStage: bottleneck,
            velocityScore: 85, // Mocked for now
            balanceScore
        };
    }

    static getActionableAdvice(stats: PipelineStats): string[] {
        const advice = [];
        if (stats.staleCandidates > 0) {
            advice.push(`You have ${stats.staleCandidates} candidates who haven't moved in 48 hours. Quick responses increase close rates by 3x.`);
        }
        if (stats.totalCandidates < 10) {
            advice.push("Pipeline volume is low. Consider using the Sourcing extension to pull in more passive profiles.");
        }
        if (stats.balanceScore < 40) {
            advice.push("The quality of matches is currently low. You might need to refine your Job Description requirements.");
        }
        return advice;
    }
}
