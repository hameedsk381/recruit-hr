import { JobBoardConnector, JobDescription, JobRequisitionRef, InboundApplication } from './types';

export class LinkedInConnector implements JobBoardConnector {
  name = 'linkedin';
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;
  private organizationId: string;

  constructor(credentials: { clientId: string; clientSecret: string; accessToken: string; organizationId: string }) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.accessToken = credentials.accessToken;
    this.organizationId = credentials.organizationId;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`https://api.linkedin.com/v2${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`LinkedIn API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async publishJob(jd: JobDescription, requisition: JobRequisitionRef): Promise<string> {
    const body = {
      externalJobPostingId: `reckruit_${Date.now()}`,
      title: jd.title,
      description: { text: jd.description },
      employmentStatus: 'FULL_TIME',
      workplaceTypes: ['REMOTE'],
      listedAt: Date.now(),
      jobPostingOperationType: 'CREATE',
      integrationContext: `urn:li:organization:${this.organizationId}`,
    };

    const result = await this.request('/simpleJobPostings', { method: 'POST', body: JSON.stringify(body) });
    return result.id || result.jobPostingId || String(Date.now());
  }

  async unpublishJob(postingId: string): Promise<void> {
    await this.request(`/simpleJobPostings/${postingId}`, {
      method: 'POST',
      body: JSON.stringify({ jobPostingOperationType: 'CLOSE' }),
    });
  }

  async getApplications(postingId: string, since?: Date): Promise<InboundApplication[]> {
    // LinkedIn applications come via webhook or ATS partner API
    console.log(`[LinkedIn] getApplications for ${postingId} since ${since}`);
    return [];
  }

  async refreshPosting(postingId: string): Promise<void> {
    await this.request(`/simpleJobPostings/${postingId}`, {
      method: 'POST',
      body: JSON.stringify({ jobPostingOperationType: 'RENEW' }),
    });
  }
}
