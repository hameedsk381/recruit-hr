import { ATSConnector, ATSJob, ATSCandidate, CandidateAssessment, ATSStage, ATSWebhookEvent, JobFilters } from './types';

export class GreenhouseConnector implements ATSConnector {
  name = 'greenhouse';
  private apiKey: string;
  private baseUrl = 'https://harvest.greenhouse.io/v1';

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
    if (!res.ok) throw new Error(`Greenhouse API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async getJobs(filters: JobFilters = {}): Promise<ATSJob[]> {
    const jobs = await this.request('/jobs?status=open');
    return jobs.map((j: any) => ({
      id: String(j.id),
      title: j.name,
      department: j.departments?.[0]?.name,
      location: j.offices?.[0]?.name,
      status: j.status,
    }));
  }

  async getCandidates(jobId: string): Promise<ATSCandidate[]> {
    const applications = await this.request(`/applications?job_id=${jobId}`);
    return applications.map((a: any) => ({
      id: String(a.candidate_id),
      name: `${a.candidate?.first_name} ${a.candidate?.last_name}`.trim(),
      email: a.candidate?.email_addresses?.[0]?.value || '',
      currentStage: a.current_stage?.name,
      appliedAt: new Date(a.applied_at),
    }));
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate> {
    const c = await this.request(`/candidates/${candidateId}`);
    return {
      id: String(c.id),
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email_addresses?.[0]?.value || '',
      phone: c.phone_numbers?.[0]?.value,
    };
  }

  async pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void> {
    const note = `AI Assessment — Fit: ${assessment.overallFit.toUpperCase()}\n${assessment.summary}\nStrengths: ${assessment.strengths.join(', ')}\nGaps: ${assessment.gaps.join(', ')}`;
    await this.pushNote(candidateId, note);
  }

  async pushNote(candidateId: string, note: string): Promise<void> {
    await this.request(`/candidates/${candidateId}/activity_feed/notes`, {
      method: 'POST',
      body: JSON.stringify({ user_id: 1, message: note, visibility: 'private' }),
    });
  }

  async updateStage(candidateId: string, stage: ATSStage): Promise<void> {
    // Greenhouse uses application IDs, not candidate IDs for stage changes
    // Requires knowing the applicationId — simplified here
    console.log(`[Greenhouse] Stage update for candidate ${candidateId} → ${stage}`);
  }

  async parseWebhook(payload: unknown): Promise<ATSWebhookEvent> {
    const p = payload as any;
    return {
      eventType: p.action === 'hire' ? 'hired' : p.action === 'advance' ? 'stage_changed' : 'candidate_added',
      candidateId: String(p.payload?.application?.candidate?.id || ''),
      jobId: String(p.payload?.application?.jobs?.[0]?.id || ''),
      stage: p.payload?.application?.current_stage?.name,
      timestamp: new Date(p.fired_at || Date.now()),
      raw: payload,
    };
  }
}
