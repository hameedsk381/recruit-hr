// Types for the AI Recruiter Copilot Decision Support System

// ==================== INPUT TYPES ====================

export interface WeightedSkill {
  skill: string;
  weight: "critical" | "important" | "nice_to_have";
  mandatory: boolean;
}

export interface JobDescriptionInput {
  title: string;
  company?: string;
  core_skills: WeightedSkill[];
  experience_expectations: {
    min_years?: number;
    max_years?: number;
    domain_specific?: string;
    notes?: string;
  };
  role_context?: string;
  location?: string;
  employment_type?: string;
}

export interface SkillEvidence {
  skill: string;
  evidence_type: "production" | "demonstrated" | "claimed";
  context?: string;
  project?: string;
  outcome?: string;
  scope?: string;
  duration?: string;
}

export interface CandidateProfileInput {
  name: string;
  email?: string;
  phone?: string;
  extracted_skills: string[];
  skill_evidence: SkillEvidence[];
  experience_estimate: {
    total_years?: number;
    relevant_years?: number;
    uncertainty?: string;
  };
  education?: string[];
  certifications?: string[];
  red_flags?: string[];
  gaps?: string[];
  recent_role?: {
    title: string;
    company: string;
    duration: string;
    relevance?: string;
  };
}

export interface MatchingSignals {
  skill_match_ratio?: number;
  experience_alignment: "exceeds" | "meets" | "below" | "unclear";
  role_relevance: "high" | "medium" | "low" | "unclear";
  mandatory_skills_met: boolean;
  missing_mandatory_skills?: string[];
}

export interface RecruiterAssessmentInput {
  job_description: JobDescriptionInput;
  candidate_profile: CandidateProfileInput;
  matching_signals: MatchingSignals;
}

// ==================== OUTPUT TYPES ====================

export interface StrengthItem {
  skill: string;
  evidence_level: "production" | "demonstrated" | "claimed";
  evidence: string;
}

export interface GapRiskItem {
  area: string;
  risk_level: "low" | "medium" | "high";
  explanation: string;
}

export interface SkillMatchItem {
  required_skill: string;
  candidate_coverage: "strong" | "partial" | "none";
  notes: string;
}

export interface InterviewFocusItem {
  topic: string;
  why: string;
  sample_probe_question: string;
}

export interface RecruiterNotes {
  override_suggestions: string;
  confidence_level: "high" | "medium" | "low";
}

export interface FitAssessment {
  overall_fit: "high" | "medium" | "low";
  reasoning: string;
}

export interface RecruiterAssessmentOutput {
  one_line_summary: string;
  fit_assessment: FitAssessment;
  strengths: StrengthItem[];
  gaps_and_risks: GapRiskItem[];
  skill_match_breakdown: SkillMatchItem[];
  interview_focus_areas: InterviewFocusItem[];
  recruiter_notes: RecruiterNotes;
}

export interface RecruiterAssessmentError {
  error: string;
}

export type RecruiterAssessmentResult = RecruiterAssessmentOutput | RecruiterAssessmentError;
