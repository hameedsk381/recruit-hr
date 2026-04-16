import { JobBoardConnector, JobDescription, JobRequisitionRef, InboundApplication } from './types';

export class IndeedConnector implements JobBoardConnector {
  name = 'indeed';
  private publisherId: string;
  private apiToken: string;

  constructor(credentials: { publisherId: string; apiToken: string }) {
    this.publisherId = credentials.publisherId;
    this.apiToken = credentials.apiToken;
  }

  async publishJob(jd: JobDescription, requisition: JobRequisitionRef): Promise<string> {
    // Indeed uses XML feed or Partner API (Employer API)
    const payload = {
      title: jd.title,
      description: jd.description,
      location: requisition.location || jd.location || 'Remote',
      company: 'reckruit',
      jobtype: 'fulltime',
      publisherId: this.publisherId,
    };

    const res = await fetch('https://apis.indeed.com/apiserver/v1/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Indeed API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    return data.jobKey || data.id || `indeed_${Date.now()}`;
  }

  async unpublishJob(postingId: string): Promise<void> {
    await fetch(`https://apis.indeed.com/apiserver/v1/jobs/${postingId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });
  }

  async getApplications(postingId: string, since?: Date): Promise<InboundApplication[]> {
    const params = new URLSearchParams({ jobKey: postingId, ...(since ? { from: since.toISOString() } : {}) });
    const res = await fetch(`https://apis.indeed.com/apiserver/v1/applications?${params}`, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.applications || []).map((a: any) => ({
      externalId: a.applicationId,
      platform: 'indeed',
      candidateName: `${a.firstName} ${a.lastName}`,
      candidateEmail: a.email,
      resumeUrl: a.resumeUrl,
      appliedAt: new Date(a.appliedAt || Date.now()),
      raw: a,
    }));
  }

  async refreshPosting(postingId: string): Promise<void> {
    console.log(`[Indeed] Refreshing posting ${postingId}`);
  }
}
