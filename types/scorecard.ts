export interface ScorecardRating {
    category: string;
    score: number; // 1-5
    notes?: string;
}

export interface Scorecard {
    id: string;
    interviewId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    evaluatorId: string;
    evaluatorName: string;
    submittedAt: string;

    // Core Ratings
    ratings: ScorecardRating[];

    // Overall Assessment
    overallScore: number; // 1-5
    recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';

    // Qualitative Feedback
    strengths: string[];
    areasForImprovement: string[];
    additionalNotes?: string;

    // AI-Assisted Fields
    aiSuggestedFollowUp?: string[];
}

export const DEFAULT_SCORECARD_CATEGORIES = [
    'Technical Skills',
    'Problem Solving',
    'Communication',
    'Culture Fit',
    'Leadership Potential'
];
