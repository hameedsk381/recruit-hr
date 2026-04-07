import { getMongoDb } from '../utils/mongoClient';
import { Scorecard, ScorecardRating, DEFAULT_SCORECARD_CATEGORIES } from '../types/scorecard';

const COLLECTION_NAME = 'scorecards';

export class ScorecardService {
    /**
     * Submit a new scorecard for an interview
     */
    static async submitScorecard(scorecard: Omit<Scorecard, 'id' | 'submittedAt'>): Promise<Scorecard> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const newScorecard: Scorecard = {
            ...scorecard,
            id: crypto.randomUUID(),
            submittedAt: new Date().toISOString()
        };

        await db.collection(COLLECTION_NAME).insertOne(newScorecard);

        // Update interview status to 'completed'
        await db.collection('interviews').updateOne(
            { id: scorecard.interviewId },
            { $set: { status: 'completed' } }
        );

        return newScorecard;
    }

    /**
     * Get scorecard for a specific interview
     */
    static async getScorecardByInterview(interviewId: string): Promise<Scorecard | null> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const scorecard = await db.collection(COLLECTION_NAME).findOne({ interviewId }) as unknown as Scorecard;
        return scorecard;
    }

    /**
     * Get all scorecards for a candidate
     */
    static async getCandidateScorecards(candidateId: string): Promise<Scorecard[]> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const scorecards = await db.collection(COLLECTION_NAME)
            .find({ candidateId })
            .sort({ submittedAt: -1 })
            .toArray() as unknown as Scorecard[];

        return scorecards;
    }

    /**
     * Generate an empty scorecard template
     */
    static generateTemplate(interviewId: string, candidateId: string, candidateName: string, jobId: string, jobTitle: string): Partial<Scorecard> {
        return {
            interviewId,
            candidateId,
            candidateName,
            jobId,
            jobTitle,
            ratings: DEFAULT_SCORECARD_CATEGORIES.map(category => ({
                category,
                score: 0,
                notes: ''
            })),
            strengths: [],
            areasForImprovement: [],
            overallScore: 0,
            recommendation: 'no_hire'
        };
    }

    /**
     * Calculate average score from ratings
     */
    static calculateAverageScore(ratings: ScorecardRating[]): number {
        const validRatings = ratings.filter(r => r.score > 0);
        if (validRatings.length === 0) return 0;

        const sum = validRatings.reduce((acc, r) => acc + r.score, 0);
        return Math.round((sum / validRatings.length) * 10) / 10;
    }

    /**
     * Synthesize multiple scorecards into a single recommendation memo
     */
    static async synthesizeScorecards(candidateId: string): Promise<string> {
        const scorecards = await this.getCandidateScorecards(candidateId);
        if (scorecards.length === 0) {
            return "No scorecards found for this candidate to synthesize.";
        }

        // Cache check
        const { getLLMCache, setLLMCache } = await import('../utils/llmCache');
        const cacheKey = `scorecard_synthesis_${candidateId}_${scorecards.length}_${scorecards[0].submittedAt}`;
        const cached = await getLLMCache(cacheKey);
        if (cached) return cached;

        const candidateName = scorecards[0].candidateName;
        const jobTitle = scorecards[0].jobTitle;

        const systemPrompt = `You are an Expert Hiring Advisor. 
Your task is to synthesize multiple interview scorecards for a candidate into a single, high-level "Recommendation Memo" for the Hiring Manager.

Focus on:
1. Convergence: Where do all interviewers agree?
2. Divergence: Are there conflicting opinions? (e.g., Technical was impressed, but Culture Fit had concerns).
3. Final Recommendation: Based on all inputs, should we Hire? What is the core rationale?
4. Risk Mitigation: If we hire, what should we support the candidate with during onboarding?

Keep the tone professional, evidence-based, and executive-ready. Use markdown for structure.`;

        const userPrompt = `Please synthesize the following interview scorecards for ${candidateName} for the position of ${jobTitle}.

Scorecards:
${scorecards.map((s, i) => `
--- INTERVIEW #${i + 1} ---
Overall Score: ${s.overallScore}/10
Recommendation: ${s.recommendation}
Ratings: ${s.ratings.map(r => `${r.category}: ${r.score}/10 (${r.notes})`).join(', ')}
Strengths: ${s.strengths.join(', ')}
Areas for Improvement: ${s.areasForImprovement.join(', ')}
`).join('\n')}

Based on these, provide a synthesized Recommendation Memo.`;

        const { groqChatCompletion } = await import('../utils/groqClient');
        const synthesis = await groqChatCompletion(systemPrompt, userPrompt, 0.4, 2048);

        await setLLMCache(cacheKey, synthesis);
        return synthesis;
    }
}
