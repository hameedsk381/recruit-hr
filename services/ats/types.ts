export interface ATSJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  status: string;
  postedAt?: Date;
}

export interface ATSCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  currentStage?: string;
  appliedAt?: Date;
  resumeUrl?: string;
}

export interface CandidateAssessment {
  overallFit: 'high' | 'medium' | 'low';
  summary: string;
  strengths: string[];
  gaps: string[];
  score?: number;
}

export type ATSStage = string;
export type ATSEventType = 'candidate_added' | 'stage_changed' | 'offer_extended' | 'hired';

export interface ATSWebhookEvent {
  eventType: ATSEventType;
  candidateId: string;
  jobId?: string;
  stage?: string;
  timestamp: Date;
  raw: unknown;
}

export interface JobFilters {
  status?: string;
  department?: string;
}

export interface ATSConnector {
  name: string;
  getJobs(filters?: JobFilters): Promise<ATSJob[]>;
  getCandidates(jobId: string): Promise<ATSCandidate[]>;
  getCandidate(candidateId: string): Promise<ATSCandidate>;
  pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void>;
  pushNote(candidateId: string, note: string): Promise<void>;
  updateStage(candidateId: string, stage: ATSStage): Promise<void>;
  parseWebhook(payload: unknown): Promise<ATSWebhookEvent>;
}
