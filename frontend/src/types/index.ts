// ==================== API Response Types ====================

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ==================== Job Description Types ====================

export interface WeightedSkill {
    skill: string;
    weight: 'critical' | 'important' | 'nice_to_have';
    mandatory: boolean;
}

export interface ExperienceExpectation {
    min_years: number;
    max_years?: number;
    domain_specific?: string;
}

export interface JobDescription {
    id: string;
    title: string;
    company?: string;
    core_skills: WeightedSkill[];
    experience_expectations: ExperienceExpectation;
    role_context?: string;
    location?: string;
    employment_type?: string;
    ai_assumptions?: string[];
}

// ==================== Candidate Profile Types ====================

export interface SkillEvidence {
    skill: string;
    evidence_type: 'production' | 'demonstrated' | 'claimed';
    context?: string;
    project?: string;
    outcome?: string;
}

export interface ExperienceEstimate {
    total_years: number;
    relevant_years?: number;
}

export interface RecentRole {
    title: string;
    company: string;
    duration?: string;
    relevance?: string;
}

export interface CandidateProfile {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    extracted_skills: string[];
    skill_evidence: SkillEvidence[];
    experience_estimate?: ExperienceEstimate;
    recent_role?: RecentRole;
    certifications?: string[];
}

// ==================== Assessment Types ====================

export interface Strength {
    skill: string;
    evidence_level: 'production' | 'demonstrated' | 'claimed';
    evidence: string;
}

export interface GapOrRisk {
    area: string;
    risk_level: 'low' | 'medium' | 'high';
    explanation: string;
}

export interface SkillMatch {
    required_skill: string;
    candidate_coverage: 'strong' | 'partial' | 'none';
    notes?: string;
}

export interface InterviewFocusArea {
    topic: string;
    why: string;
    sample_probe_question: string;
}

export interface RecruiterNotes {
    notes?: string;
    override_suggestions?: string;
    confidence_level?: 'low' | 'medium' | 'high';
}

export interface FitAssessment {
    overall_fit: 'high' | 'medium' | 'low';
    reasoning: string;
}

export interface CandidateAssessment {
    one_line_summary: string;
    fit_assessment: FitAssessment;
    strengths: Strength[];
    gaps_and_risks: GapOrRisk[];
    skill_match_breakdown: SkillMatch[];
    interview_focus_areas: InterviewFocusArea[];
    recruiter_notes?: RecruiterNotes;
}

// ==================== Shortlist Types ====================

export type PipelineStage = 'applied' | 'shortlisted' | 'technical' | 'culture' | 'pending' | 'offer' | 'hm_approved' | 'hm_rejected';

export interface ShortlistCandidate {
    id: string;
    profile: CandidateProfile;
    assessment: CandidateAssessment;
    rank: number;
    pinned: boolean;
    removed: boolean;
    removal_reason?: string;
    stage?: PipelineStage;
    hmDecision?: 'approved' | 'rejected';
    hmNotes?: string;
}

// ==================== Copilot Types ====================

export interface CopilotAction {
    type: 'summarize' | 'compare' | 'interview_probes' | 'clarify';
    context?: string;
    compare_with?: string[];
    timestamp: string;
}

export interface CopilotHistoryItem {
    action: CopilotAction;
    response: string;
}

// ==================== Interview Types ====================

export interface Interview {
    id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
    tenantId: string;
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
    type: 'technical' | 'hr' | 'culture' | 'coding';
    meetingLink?: string;
    notes?: string;
    recruiterId: string;
    focusAreas?: Array<{ topic: string; why: string; sample_probe_question: string }>;
    calendarEventId?: string;
    calendarLink?: string;
    reminderSent?: boolean;
}

// ==================== UI State Types ====================

export interface FilterState {
    fitLevel: string[];
    showRemoved: boolean;
}

export interface ViewState {
    currentView: 'setup' | 'shortlist' | 'detail';
    selectedCandidateId: string | null;
    sidebarOpen: boolean;
}

// ==================== JD Extraction Response ====================

export interface JDExtractionResponse {
    success: boolean;
    data?: {
        title?: string;
        company?: string;
        skills?: string[];
        requiredIndustrialExperienceYears?: number;
        domainExperience?: string[];
        responsibilities?: string[];
        location?: string;
        employmentType?: string;
    };
    error?: string;
}

// ==================== Match Response ====================

export interface MatchResponse {
    'POST Response': Array<{
        Id: string;
        'Resume Data': {
            name?: string;
            email?: string;
            skills?: string[];
            experience?: number;
            certifications?: string[];
        };
        Analysis?: {
            'Matching Score': number;
            'Matched Skills': string[];
            'Unmatched Skills': string[];
            Recommendations: string[];
        };
    }>;
}
