import type { ShortlistCandidate, JobDescription } from "../types";

export class NurtureService {
    static async checkAndTriggerNurture(candidates: ShortlistCandidate[], _job: JobDescription): Promise<string[]> {
        const triggers = [];
        
        for (const candidate of candidates) {
            if (candidate.removed) continue;

            // Trigger 1: High fit candidate stuck in Shortlisted
            if (candidate.assessment.fit_assessment.overall_fit === 'high' && candidate.stage === 'shortlisted') {
                // In a real app, we'd check 'updatedAt'
                // For now, let's assume they need nurture if they are pinned
                if (candidate.pinned) {
                    triggers.push(`Candidate ${candidate.profile.name} is a top match. Sending a 'Stay Warm' update to keep them engaged.`);
                }
            }

            // Trigger 2: Post-Technical interview follow up
            if (candidate.stage === 'technical') {
                triggers.push(`Drafting technical interview feedback for ${candidate.profile.name}.`);
            }
        }

        return triggers;
    }

    static async generateDrafts(candidates: ShortlistCandidate[]): Promise<{ count: number }> {
        // Mock implementation for demo
        const eligible = candidates.filter(c => !c.removed && (c.stage === 'shortlisted' || c.stage === 'technical'));
        console.log(`[Nurture] Generating drafts for ${eligible.length} candidates`);
        return { count: eligible.length };
    }
}
