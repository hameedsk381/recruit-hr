import { ATSConnector, ATSJob, ATSCandidate, CandidateAssessment, ATSStage, ATSWebhookEvent, JobFilters } from './types';

/**
 * Workday ATS Connector
 * Workday uses a REST API (Staffing worklet) — tenant URL varies per org.
 * Auth: OAuth 2.0 client credentials
 */
export class WorkdayConnector implements ATSConnector {
  name = 'workday';
  private tenantUrl: string;
  private accessToken: string;

  constructor(tenantUrl: string, accessToken: string) {
    this.tenantUrl = tenantUrl.replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.tenantUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`Workday API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async getJobs(filters: JobFilters = {}): Promise<ATSJob[]> {
    const data = await this.request('/staffing/v6/jobPostings?includeSubordinateOrganizations=true&limit=100');
    return (data?.data || []).map((j: any) => ({
      id: j.id,
      title: j.jobPostingTitle,
      department: j.organizationalUnit?.descriptor,
      location: j.primaryLocation?.descriptor,
      status: j.jobPostingStatus?.descriptor || 'open',
    }));
  }

  async getCandidates(jobId: string): Promise<ATSCandidate[]> {
    const data = await this.request(`/staffing/v6/jobApplications?jobPosting=${jobId}&limit=100`);
    return (data?.data || []).map((a: any) => ({
      id: a.id,
      name: a.candidate?.descriptor || '',
      email: a.email || '',
      currentStage: a.recruitingStage?.descriptor,
    }));
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate> {
    const c = await this.request(`/staffing/v6/candidates/${candidateId}`);
    return {
      id: c.id,
      name: c.fullName || '',
      email: c.primaryEmail || '',
      phone: c.primaryPhone,
    };
  }

  async pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void> {
    const note = `AI Assessment — Fit: ${assessment.overallFit.toUpperCase()}\n${assessment.summary}`;
    await this.pushNote(candidateId, note);
  }

  async pushNote(candidateId: string, note: string): Promise<void> {
    // Workday: add comment to candidate record via PATCH
    await this.request(`/staffing/v6/candidates/${candidateId}`, {
      method: 'PATCH',
      body: JSON.stringify({ comments: [{ comment: note }] }),
    });
  }

  async updateStage(candidateId: string, stage: ATSStage): Promise<void> {
    // Workday stage transitions require specific workflow actions
    console.log(`[Workday] Stage update for candidate ${candidateId} → ${stage}`);
  }

  async parseWebhook(payload: unknown): Promise<ATSWebhookEvent> {
    const p = payload as any;
    return {
      eventType: 'stage_changed',
      candidateId: p.candidateId || p.workdayID || '',
      jobId: p.jobId,
      stage: p.stage,
      timestamp: new Date(p.eventTime || Date.now()),
      raw: payload,
    };
  }
}
