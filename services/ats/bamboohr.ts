import { ATSConnector, ATSJob, ATSCandidate, CandidateAssessment, ATSStage, ATSWebhookEvent, JobFilters } from './types';

export class BambooHRConnector implements ATSConnector {
  name = 'bamboohr';
  private subdomain: string;
  private apiKey: string;
  private get baseUrl() { return `https://api.bamboohr.com/api/gateway.php/${this.subdomain}/v1`; }

  constructor(subdomain: string, apiKey: string) {
    this.subdomain = subdomain;
    this.apiKey = apiKey;
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${this.apiKey}:x`).toString('base64')}`;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`BambooHR API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async getJobs(filters: JobFilters = {}): Promise<ATSJob[]> {
    const data = await this.request('/applicant_tracking/jobs');
    return (data || []).map((j: any) => ({
      id: String(j.id),
      title: j.title?.label || '',
      department: j.department?.label,
      location: j.location?.label,
      status: j.isOpen ? 'open' : 'closed',
    }));
  }

  async getCandidates(jobId: string): Promise<ATSCandidate[]> {
    const data = await this.request(`/applicant_tracking/jobs/${jobId}/applications`);
    return (data || []).map((a: any) => ({
      id: String(a.id),
      name: `${a.firstName} ${a.lastName}`.trim(),
      email: a.email || '',
      phone: a.phone,
      currentStage: a.status?.label,
      appliedAt: a.appliedDate ? new Date(a.appliedDate) : undefined,
    }));
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate> {
    const a = await this.request(`/applicant_tracking/applications/${candidateId}`);
    return {
      id: String(a.id),
      name: `${a.firstName} ${a.lastName}`.trim(),
      email: a.email || '',
      phone: a.phone,
    };
  }

  async pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void> {
    const note = `AI Assessment — Fit: ${assessment.overallFit.toUpperCase()}\n${assessment.summary}\nStrengths: ${assessment.strengths.join(', ')}`;
    await this.pushNote(candidateId, note);
  }

  async pushNote(candidateId: string, note: string): Promise<void> {
    await this.request(`/applicant_tracking/applications/${candidateId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment: note }),
    });
  }

  async updateStage(candidateId: string, stage: ATSStage): Promise<void> {
    await this.request(`/applicant_tracking/applications/${candidateId}`, {
      method: 'POST',
      body: JSON.stringify({ status: { id: stage } }),
    });
  }

  async parseWebhook(payload: unknown): Promise<ATSWebhookEvent> {
    const p = payload as any;
    return {
      eventType: p.event === 'hire' ? 'hired' : 'stage_changed',
      candidateId: String(p.applicationId || ''),
      jobId: String(p.jobId || ''),
      stage: p.status,
      timestamp: new Date(p.timestamp || Date.now()),
      raw: payload,
    };
  }
}
