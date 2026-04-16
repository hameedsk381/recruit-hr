import { JobBoardConnector, JobDescription, JobRequisitionRef, InboundApplication } from './types';

export class NaukriConnector implements JobBoardConnector {
  name = 'naukri';
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;

  constructor(credentials: { clientId: string; clientSecret: string; accessToken: string }) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.accessToken = credentials.accessToken;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`https://www.naukri.com/recruiter-job-posting/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        appid: this.clientId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`Naukri API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async publishJob(jd: JobDescription, requisition: JobRequisitionRef): Promise<string> {
    const body = {
      title: jd.title,
      jobDesc: jd.description,
      functionalAreaId: '1',
      subFunctionalAreaId: '1',
      industryId: '1',
      department: requisition.department || jd.department || 'Technology',
      location: [requisition.location || jd.location || 'Work From Home'],
      noticePeriod: 90,
      minExperience: 0,
      maxExperience: 10,
    };
    const result = await this.request('/job', { method: 'POST', body: JSON.stringify(body) });
    return result.jobId || result.id || `naukri_${Date.now()}`;
  }

  async unpublishJob(postingId: string): Promise<void> {
    await this.request(`/job/${postingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'EXPIRED' }),
    });
  }

  async getApplications(postingId: string, since?: Date): Promise<InboundApplication[]> {
    const params = new URLSearchParams({ jobId: postingId });
    if (since) params.append('fromDate', since.toISOString().split('T')[0]);
    const data = await this.request(`/applications?${params}`);
    return (data.applicants || []).map((a: any) => ({
      externalId: a.candidateId,
      platform: 'naukri',
      candidateName: a.name,
      candidateEmail: a.email,
      resumeUrl: a.resumeUrl,
      appliedAt: new Date(a.applicationDate || Date.now()),
      raw: a,
    }));
  }

  async refreshPosting(postingId: string): Promise<void> {
    await this.request(`/job/${postingId}/refresh`, { method: 'PUT' });
  }
}
