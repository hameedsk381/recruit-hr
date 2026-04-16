import type { ObjectId } from 'mongodb';

export interface JobDescription {
  id?: string;
  title: string;
  department?: string;
  location?: string;
  description: string;
  requirements?: string[];
  salary?: { min: number; max: number; currency: string };
}

export interface JobRequisitionRef {
  _id?: ObjectId;
  tenantId: string;
  title: string;
  department?: string;
  location?: string;
}

export interface InboundApplication {
  externalId: string;
  platform: string;
  candidateName: string;
  candidateEmail: string;
  resumeUrl?: string;
  appliedAt: Date;
  raw?: unknown;
}

export interface JobBoardConnector {
  name: string;
  publishJob(jd: JobDescription, requisition: JobRequisitionRef): Promise<string>; // returns postingId
  unpublishJob(postingId: string): Promise<void>;
  getApplications(postingId: string, since?: Date): Promise<InboundApplication[]>;
  refreshPosting(postingId: string): Promise<void>;
}

export interface JobPosting {
  _id?: ObjectId;
  tenantId: string;
  requisitionId: ObjectId;
  platform: 'linkedin' | 'indeed' | 'naukri' | 'glassdoor' | 'dice' | 'monster';
  postingId: string;
  url: string;
  status: 'active' | 'paused' | 'expired' | 'removed';
  variant?: string;
  metrics: {
    views: number;
    applications: number;
    costPerApplication?: number;
    lastSyncedAt: Date;
  };
  publishedAt: Date;
  expiresAt: Date;
}
