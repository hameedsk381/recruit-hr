import { JobBoardConnector, JobDescription, JobRequisitionRef, InboundApplication } from './types';

export class GlassdoorConnector implements JobBoardConnector {
  name = 'glassdoor';
  private partnerId: string;
  private partnerKey: string;

  constructor(credentials: { partnerId: string; partnerKey: string }) {
    this.partnerId = credentials.partnerId;
    this.partnerKey = credentials.partnerKey;
  }

  async publishJob(jd: JobDescription, requisition: JobRequisitionRef): Promise<string> {
    // Glassdoor job posting via employer job listing API
    const body = {
      jobTitle: jd.title,
      jobDescription: jd.description,
      location: requisition.location || jd.location || 'Remote',
      partnerJobId: `reckruit_${Date.now()}`,
    };

    const res = await fetch('https://api.glassdoor.com/api/api.htm?v=1&format=json&t.p=jobPostings&action=create', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.partnerId}:${this.partnerKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Glassdoor API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    return data.jobId || `gd_${Date.now()}`;
  }

  async unpublishJob(postingId: string): Promise<void> {
    await fetch(`https://api.glassdoor.com/api/api.htm?v=1&format=json&t.p=jobPostings&action=delete&jobId=${postingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.partnerId}:${this.partnerKey}`).toString('base64')}`,
      },
    });
  }

  async getApplications(_postingId: string, _since?: Date): Promise<InboundApplication[]> {
    // Glassdoor routes applications via ATS, not direct API
    return [];
  }

  async refreshPosting(postingId: string): Promise<void> {
    console.log(`[Glassdoor] Refreshing posting ${postingId}`);
  }
}
