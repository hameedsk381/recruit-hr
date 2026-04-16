import { ATSConnector, ATSJob, ATSCandidate, CandidateAssessment, ATSStage, ATSWebhookEvent, JobFilters } from './types';

export class LeverConnector implements ATSConnector {
  name = 'lever';
  private apiKey: string;
  private baseUrl = 'https://api.lever.co/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { Authorization: this.authHeader, 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(`Lever API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    return data.data ?? data;
  }

  async getJobs(filters: JobFilters = {}): Promise<ATSJob[]> {
    const postings = await this.request('/postings?state=published');
    return (Array.isArray(postings) ? postings : []).map((p: any) => ({
      id: p.id,
      title: p.text,
      department: p.categories?.department,
      location: p.categories?.location,
      status: p.state,
    }));
  }

  async getCandidates(jobId: string): Promise<ATSCandidate[]> {
    const opps = await this.request(`/opportunities?posting_id=${jobId}`);
    return (Array.isArray(opps) ? opps : []).map((o: any) => ({
      id: o.id,
      name: o.name,
      email: o.emails?.[0] || '',
      phone: o.phones?.[0]?.value,
      currentStage: o.stage,
      appliedAt: o.createdAt ? new Date(o.createdAt) : undefined,
    }));
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate> {
    const o = await this.request(`/opportunities/${candidateId}`);
    return {
      id: o.id,
      name: o.name,
      email: o.emails?.[0] || '',
      phone: o.phones?.[0]?.value,
      currentStage: o.stage,
    };
  }

  async pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void> {
    const note = `AI Assessment — Fit: ${assessment.overallFit.toUpperCase()}\n${assessment.summary}`;
    await this.pushNote(candidateId, note);
  }

  async pushNote(candidateId: string, note: string): Promise<void> {
    await this.request(`/opportunities/${candidateId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ value: note, secret: false }),
    });
  }

  async updateStage(candidateId: string, stage: ATSStage): Promise<void> {
    await this.request(`/opportunities/${candidateId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage }),
    });
  }

  async parseWebhook(payload: unknown): Promise<ATSWebhookEvent> {
    const p = payload as any;
    return {
      eventType: p.event === 'candidateHired' ? 'hired' : p.event === 'candidateStageChange' ? 'stage_changed' : 'candidate_added',
      candidateId: p.data?.opportunityId || '',
      jobId: p.data?.postingId,
      stage: p.data?.toStageId,
      timestamp: new Date(p.createdAt || Date.now()),
      raw: payload,
    };
  }
}
