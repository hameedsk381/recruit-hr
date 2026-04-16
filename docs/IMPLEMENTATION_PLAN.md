# reckruit.ai — Enterprise Recruitment Automation OS
## Implementation Plan & Technical Documentation

**Version:** 1.0  
**Date:** 2026-04-15  
**Status:** Approved for execution  
**Owner:** Engineering Team

---

## Table of Contents

1. [Vision & Objective](#1-vision--objective)
2. [Current State Audit](#2-current-state-audit)
3. [Target Architecture](#3-target-architecture)
4. [Phase 1 — Lifecycle Completeness (Months 1–3)](#4-phase-1--lifecycle-completeness)
5. [Phase 2 — Sourcing & Top-of-Funnel (Months 3–6)](#5-phase-2--sourcing--top-of-funnel)
6. [Phase 3 — AI Intelligence Deepening (Months 4–7)](#6-phase-3--ai-intelligence-deepening)
7. [Phase 4 — Enterprise Operations & Scale (Months 6–10)](#7-phase-4--enterprise-operations--scale)
8. [Phase 5 — Marketplace & Ecosystem (Months 10–14)](#8-phase-5--marketplace--ecosystem)
9. [Technical Standards](#9-technical-standards)
10. [Database Schema Additions](#10-database-schema-additions)
11. [API Contract Reference](#11-api-contract-reference)
12. [Infrastructure Blueprint](#12-infrastructure-blueprint)
13. [Testing Strategy](#13-testing-strategy)
14. [Security Checklist](#14-security-checklist)

---

## 1. Vision & Objective

**Product Vision:** reckruit.ai is the AI-native Recruitment Automation OS for enterprises — covering the full hiring lifecycle from workforce planning and sourcing through to onboarding, with AI accelerating every stage while humans retain every decision.

**What "OS" means:**
- Every hiring workflow runs inside reckruit.ai, not across disconnected tools
- Third-party tools (ATS, HRIS, BGV, job boards) integrate into reckruit.ai, not the other way around
- AI compounds with each hire — the system gets smarter from tenant data

**Non-negotiable principles (inherited from `ENTERPRISE_ARCHITECTURE.md`):**
1. Human-in-the-loop by default — AI assists, humans decide
2. Hard tenant isolation — no cross-tenant anything
3. Explainability is a system — reasoning is first-class data
4. LLMs are replaceable components — model lock-in is a risk
5. Compliance by design — GDPR, DPDP, EEO baked in

---

## 2. Current State Audit

### What Exists (Built & Working)

| Area | Files | Status |
|------|-------|--------|
| Resume extraction | `services/resumeExtractor.ts`, `routes/resumeExtract.ts` | ✅ Solid |
| JD extraction & validation | `services/jdExtractor.ts`, `services/jdValidator.ts` | ✅ Solid |
| Single & batch matching | `services/jobMatcher.ts`, `services/multipleJobMatcher.ts` | ✅ Solid |
| Recruiter copilot & assessment | `services/recruiterCopilot.ts`, `routes/recruiterAssess.ts` | ✅ Strong |
| Interview scheduling | `services/interviewService.ts`, `routes/interviews.ts` | ✅ Good |
| Scorecard collection & synthesis | `services/scorecardService.ts`, `routes/scorecards.ts` | ✅ Good |
| MCQ + voice interview generation | `services/mcqGenerator.ts`, `services/voiceInterviewGenerator.ts` | ✅ Good |
| Answer & audio evaluation | `services/answerEvaluator.ts`, `services/audioEvaluator.ts` | ✅ Good |
| ATS sync (Zoho, Darwinbox) | `services/atsIntegrationService.ts`, `routes/atsSync.ts` | ⚠️ Partial |
| Calendar (Google) | `services/calendarService.ts`, `routes/calendar.ts` | ⚠️ Partial |
| Email notifications | `services/emailService.ts` | ⚠️ Email only |
| Batch processing queue | `services/batchProcessingService.ts`, `services/queueService.ts` | ✅ Good |
| GDPR / DPDP compliance | `services/privacyService.ts`, `routes/privacy.ts`, `routes/dpdpCompliance.ts` | ✅ Good |
| Audit logging | `services/auditService.ts` | ✅ Good |
| Multi-tenancy & RBAC | `middleware/authMiddleware.ts` | ⚠️ Needs hardening |
| KPI & ROI analytics | `services/kpiService.ts`, `services/roiAnalyticsService.ts` | ⚠️ Basic |
| LLM routing | `services/llmRouter.ts` | ✅ Good |
| Prompt versioning | `services/promptRegistry.ts` | ✅ Good |

### Critical Gaps (Lifecycle Holes)

| Gap | Impact | Phase |
|-----|--------|-------|
| No job requisition workflow | Cannot start a hire without a JD manually | P1 |
| No offer management | Cannot close a hire inside the platform | P1 |
| No e-signature | Enterprise compliance blocker | P1 |
| No background verification | Enterprise compliance blocker | P1 |
| No sourcing / talent pool | Platform is reactive, not proactive | P2 |
| No job board publishing | Cannot distribute roles from the platform | P2 |
| Limited ATS coverage | Workday, Greenhouse, Lever not supported | P1 |
| No onboarding module | Lifecycle ends at hire, not Day 1 | P4 |
| No blind screening | Bias risk, legal exposure | P1 |
| No predictive analytics | No forward-looking intelligence | P3 |
| No visual workflow builder | Automation requires code, not clicks | P4 |
| No Kubernetes / horizontal scale | Single-node production risk | P4 |
| No `/v1` API versioning | Enterprise IT will reject unversioned APIs | P1 |

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  Web App (React)  │  Mobile App (React Native)  │  Public API (SDK)  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼────────────────────────────────────────┐
│                       API GATEWAY (v1/v2)                            │
│  Rate limiting per tenant  │  IP allowlist  │  Request signing       │
│  OpenAPI 3.1 validated     │  Prometheus metrics  │  Health checks   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    AUTH & IDENTITY LAYER                             │
│  JWT (short-lived)  │  SAML/OIDC SSO  │  Magic links  │  SCIM      │
│  RBAC: Recruiter / HiringManager / Admin / Compliance               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    TENANT ROUTER                                      │
│  Injects tenant_id → DB, cache, vector store, logs                  │
│  Per-tenant encryption keys (KMS)  │  Physical isolation (Enterprise)│
└────────┬──────────┬─────────────┬───────────────┬───────────────────┘
         │          │             │               │
    ┌────▼───┐ ┌────▼────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │SOURCING│ │ HIRING  │ │ OFFER &   │ │  ANALYTICS  │
    │ ENGINE │ │PIPELINE │ │ ONBOARD   │ │    & BI     │
    └────────┘ └─────────┘ └───────────┘ └─────────────┘
         │          │             │               │
┌────────▼──────────▼─────────────▼───────────────▼───────────────────┐
│                        AI REASONING LAYER                             │
│  Matching Engine │ Copilot │ Predictive Models │ Bias Detection       │
│  LLM Router (Groq → OpenAI → Ollama)  │  Prompt Registry            │
│  Embedding Engine (Qdrant)  │  RAG Pipeline  │  Fine-tune Loop       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                        DATA LAYER                                     │
│  MongoDB (primary)  │  Redis (cache/queues)  │  Qdrant (vectors)    │
│  BullMQ (job queues)  │  Temporal.io (durable workflows)            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                   GOVERNANCE & COMPLIANCE                             │
│  Audit log (immutable)  │  GDPR/DPDP  │  Blind screening            │
│  EEO reporting  │  Bias detection  │  Decision trace builder         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                   INTEGRATION LAYER                                   │
│  ATS: Greenhouse, Lever, Workday, BambooHR, Zoho, Darwinbox         │
│  Job boards: LinkedIn, Indeed, Naukri, Glassdoor                    │
│  BGV: AuthBridge, Checkr, IDfy, Sterling                            │
│  E-sign: DocuSign, Adobe Sign                                        │
│  Comms: Email (Resend), SMS (Twilio), WhatsApp, Slack, Teams        │
│  Calendar: Google Calendar, Outlook / MS Graph                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 1 — Lifecycle Completeness

**Timeline:** Months 1–3  
**Goal:** Close the deal-blocking gaps. No enterprise sale is possible without offer management, BGV, and requisition workflows.

---

### 4.1 API Versioning & Health Endpoints

**Why first:** Enterprise IT teams require versioned, observable APIs before any procurement approval.

**Files to create:**
- `routes/v1/index.ts` — re-exports all existing routes under `/v1` prefix
- `routes/health.ts` — health, readiness, metrics

**Implementation:**

```typescript
// routes/health.ts
export async function healthHandler(_req: Request): Promise<Response> {
  const checks = {
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: await checkMongo(),   // ping MongoDB
      redis: await checkRedis(),     // ping Redis
      llm: await checkLLM(),         // Groq availability
    }
  };
  const allHealthy = Object.values(checks.services).every(s => s === "healthy");
  return Response.json(checks, { status: allHealthy ? 200 : 503 });
}

export async function readyHandler(_req: Request): Promise<Response> {
  // Only returns 200 when all critical services are up
  // Used by Kubernetes readiness probes
}

export async function metricsHandler(_req: Request): Promise<Response> {
  // Returns Prometheus text format:
  // reckruit_requests_total{method, route, status} counter
  // reckruit_inference_duration_seconds{model} histogram
  // reckruit_active_tenants gauge
  // reckruit_queue_depth{queue_name} gauge
}
```

**Register in `index.ts`:**
```typescript
// Public endpoints (no auth)
if (url.pathname === "/health")   return healthHandler(req);
if (url.pathname === "/ready")    return readyHandler(req);
if (url.pathname === "/metrics")  return metricsHandler(req);

// All existing routes gain /v1 prefix
// Old routes kept for 6 months with deprecation headers
if (url.pathname.startsWith("/v1/")) {
  // strip /v1 and route to existing handlers
}
```

---

### 4.2 Job Requisition Module

**New files:**
- `services/requisitionService.ts`
- `routes/v1/requisitions.ts`
- Frontend: `frontend/src/pages/Requisitions.tsx`

**Data model:**

```typescript
interface JobRequisition {
  _id: ObjectId;
  tenantId: string;
  title: string;
  department: string;
  location: string;
  headcount: number;
  budgetBand: { min: number; max: number; currency: string };
  justification: string;
  linkedJD?: ObjectId;             // References extracted JD
  approvalChain: ApprovalStep[];
  status: "draft" | "pending_approval" | "approved" | "published" | "closed" | "frozen";
  publishedTo: JobBoardTarget[];
  hiringManagerId: string;
  recruiterId?: string;
  targetHireDate: Date;
  createdAt: Date;
  updatedAt: Date;
  auditTrail: AuditEntry[];
}

interface ApprovalStep {
  approverRole: string;       // "hiring_manager" | "department_head" | "finance" | "ceo"
  approverId?: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  decidedAt?: Date;
}
```

**API endpoints:**

```
POST   /v1/requisitions              Create new requisition
GET    /v1/requisitions              List requisitions (filtered by status, dept)
GET    /v1/requisitions/:id          Get single requisition
PATCH  /v1/requisitions/:id          Update requisition
POST   /v1/requisitions/:id/approve  Approve/reject a requisition step
POST   /v1/requisitions/:id/publish  Publish to job boards
DELETE /v1/requisitions/:id          Close/cancel requisition
```

**AI integration:** When a requisition is created, AI auto-suggests a JD draft from:
- Role title + department + past similar requisitions for this tenant
- Prompt: `services/promptRegistry.ts` entry `SUGGEST_JD_FROM_REQUISITION`

---

### 4.3 Offer Management Module

**New files:**
- `services/offerService.ts`
- `routes/v1/offers.ts`
- Frontend: `frontend/src/pages/Offers.tsx`

**Data model:**

```typescript
interface Offer {
  _id: ObjectId;
  tenantId: string;
  candidateId: ObjectId;
  jobId: ObjectId;
  requisitionId: ObjectId;
  compensation: {
    base: number;
    currency: string;
    bonus?: number;
    equity?: string;
    signingBonus?: number;
    benefits: string[];
  };
  startDate: Date;
  expiryDate: Date;
  letterTemplate: string;          // Template ID from offerTemplates collection
  generatedLetterUrl?: string;     // S3/storage URL
  status: "draft" | "pending_approval" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "withdrawn";
  signingProvider: "docusign" | "adobe_sign" | "manual";
  signingEnvelopeId?: string;      // DocuSign envelope ID
  approvalChain: ApprovalStep[];
  history: OfferHistoryEntry[];
  createdBy: string;
  createdAt: Date;
}
```

**API endpoints:**

```
POST   /v1/offers                    Create offer draft
GET    /v1/offers/:id                Get offer
PATCH  /v1/offers/:id                Update offer draft
POST   /v1/offers/:id/send           Send to candidate (triggers e-sign)
POST   /v1/offers/:id/approve        Approval chain step
POST   /v1/offers/:id/withdraw       Withdraw offer
GET    /v1/offers/:id/status         Real-time status (polling or webhook)
POST   /v1/offers/templates          Create/manage offer letter templates
```

**E-signature integration (DocuSign):**

```typescript
// services/esignService.ts
export class ESignService {
  async sendForSignature(offerId: string, tenantId: string): Promise<string> {
    // 1. Generate PDF from offer letter template + candidate data
    // 2. Create DocuSign envelope
    // 3. Add recipient (candidate email)
    // 4. Send envelope
    // 5. Store envelopeId on offer record
    // 6. Register webhook to receive status updates
    return envelopeId;
  }

  async handleWebhook(payload: DocuSignWebhookPayload): Promise<void> {
    // Update offer status when candidate signs / declines
    // Trigger onboarding workflow if signed
  }
}
```

**AI integration:** AI drafts the offer letter from:
- Candidate profile + JD + compensation bands
- Past accepted offers for similar roles (anonymized)

---

### 4.4 Background Verification (BGV) Module

**New files:**
- `services/bgvService.ts`
- `routes/v1/bgv.ts`

**Data model:**

```typescript
interface BGVRequest {
  _id: ObjectId;
  tenantId: string;
  candidateId: ObjectId;
  offerId: ObjectId;
  provider: "authbridge" | "checkr" | "idfy" | "sterling";
  checks: BGVCheckType[];    // "identity" | "employment" | "education" | "criminal" | "credit" | "address"
  status: "initiated" | "in_progress" | "completed" | "failed" | "cancelled";
  providerReferenceId: string;
  result?: {
    overall: "clear" | "consider" | "suspended";
    checkResults: { check: BGVCheckType; status: string; notes?: string }[];
    completedAt: Date;
    reportUrl?: string;
  };
  autoDecision?: "proceed" | "hold" | "reject";    // AI-assisted decision
  recruiterOverride?: { decision: string; reason: string; by: string };
  createdAt: Date;
}
```

**API endpoints:**

```
POST  /v1/bgv/initiate         Trigger BGV for candidate+offer
GET   /v1/bgv/:id              Get BGV status
POST  /v1/bgv/webhook          Receive vendor status callbacks
POST  /v1/bgv/:id/decide       Recruiter decision after BGV result
```

**Vendor abstraction:**

```typescript
// services/bgvService.ts
interface BGVProvider {
  name: string;
  initiateCheck(candidate: CandidateProfile, checks: BGVCheckType[]): Promise<string>;
  getStatus(referenceId: string): Promise<BGVStatus>;
  parseWebhook(payload: unknown): BGVWebhookResult;
}

// Pluggable implementations:
// services/bgv/authbridge.ts  (India-primary)
// services/bgv/checkr.ts      (US-primary)
// services/bgv/idfy.ts        (India-alternative)
```

---

### 4.5 Blind Screening Mode

**Modify:** `services/resumeExtractor.ts`, `services/recruiterCopilot.ts`

**Implementation:**

```typescript
// Add to tenant settings schema
interface TenantSettings {
  // existing fields...
  blindScreening: {
    enabled: boolean;
    redactFields: Array<"name" | "email" | "phone" | "photo" | "address" | "linkedin" | "nationality">;
    revealAfterStage: "shortlist" | "interview" | "offer" | "never";
  };
}

// In resumeExtractor.ts — add blind mode output:
function applyBlindMode(resume: ResumeData, settings: TenantSettings): ResumeData {
  if (!settings.blindScreening.enabled) return resume;
  return {
    ...resume,
    name: "[REDACTED]",
    email: "[REDACTED]",
    phone: "[REDACTED]",
    linkedin: settings.blindScreening.redactFields.includes("linkedin") ? "[REDACTED]" : resume.linkedin,
    // Keep: skills, experience, education, certifications
  };
}
```

**Audit:** Every blind screening toggle and reveal event is logged in `auditService.ts`.

---

### 4.6 ATS Integration Expansion

**Modify:** `services/atsIntegrationService.ts`

**Add connectors for:**

```typescript
// services/ats/greenhouse.ts
export class GreenhouseConnector implements ATSConnector {
  async getJobs(): Promise<ATSJob[]>
  async getCandidates(jobId: string): Promise<ATSCandidate[]>
  async pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void>
  async updateStage(candidateId: string, stage: string): Promise<void>
  async getWebhookPayload(raw: unknown): Promise<ATSWebhookEvent>
}

// services/ats/lever.ts       — same interface
// services/ats/workday.ts     — same interface (Workday uses SOAP + REST hybrid)
// services/ats/bamboohr.ts    — same interface
```

**Interface contract (all ATS connectors must implement):**

```typescript
interface ATSConnector {
  name: string;
  getJobs(filters?: JobFilters): Promise<ATSJob[]>;
  getCandidates(jobId: string): Promise<ATSCandidate[]>;
  getCandidate(candidateId: string): Promise<ATSCandidate>;
  pushAssessment(candidateId: string, assessment: CandidateAssessment): Promise<void>;
  pushNote(candidateId: string, note: string): Promise<void>;
  updateStage(candidateId: string, stage: ATSStage): Promise<void>;
  subscribeWebhook(events: ATSEventType[], callbackUrl: string): Promise<string>;
  parseWebhook(payload: unknown): Promise<ATSWebhookEvent>;
}
```

---

## 5. Phase 2 — Sourcing & Top-of-Funnel

**Timeline:** Months 3–6  
**Goal:** reckruit.ai becomes the place where hiring *starts*, not just where applications are processed.

---

### 5.1 Job Board Publishing

**New files:**
- `services/jobBoardService.ts`
- `services/jobBoards/linkedin.ts`
- `services/jobBoards/indeed.ts`
- `services/jobBoards/naukri.ts`
- `services/jobBoards/glassdoor.ts`

**Interface:**

```typescript
interface JobBoardConnector {
  name: string;
  publishJob(jd: JobDescription, requisition: JobRequisition): Promise<string>;  // returns posting ID
  unpublishJob(postingId: string): Promise<void>;
  getApplications(postingId: string, since?: Date): Promise<InboundApplication[]>;
  refreshPosting(postingId: string): Promise<void>;
}
```

**AI integration:**
- AI rewrites JD title, summary, and requirements for each platform's audience and character limits
- Prompt: `OPTIMIZE_JD_FOR_PLATFORM` in `promptRegistry.ts`
- A/B test JD variants (track application rate per variant)

**Data model:**

```typescript
interface JobPosting {
  _id: ObjectId;
  tenantId: string;
  requisitionId: ObjectId;
  platform: "linkedin" | "indeed" | "naukri" | "glassdoor" | "dice" | "monster";
  postingId: string;        // Platform-assigned ID
  url: string;
  status: "active" | "paused" | "expired" | "removed";
  variant?: string;         // A/B test variant ID
  metrics: {
    views: number;
    applications: number;
    costPerApplication?: number;
    lastSyncedAt: Date;
  };
  publishedAt: Date;
  expiresAt: Date;
}
```

---

### 5.2 Talent Pool & CRM

**New files:**
- `services/talentPoolService.ts`
- `routes/v1/talentPool.ts`
- Frontend: `frontend/src/pages/TalentPool.tsx`

**Data model:**

```typescript
interface TalentProfile {
  _id: ObjectId;
  tenantId: string;
  source: "applied" | "sourced" | "referred" | "imported" | "rehire";
  sourceDetail: string;       // "linkedin_inmail" | "referral:employee123" | "greenhouse_import"
  candidate: ResumeData;
  vector?: number[];          // Embedding for semantic search (stored in Qdrant)
  tags: string[];
  notes: RecruiterNote[];
  pipeline: {
    currentStage: string;
    requisitionId?: ObjectId;
    lastActivity: Date;
  };
  nurture: {
    enrolled: boolean;
    sequenceId?: string;
    lastContactAt?: Date;
    nextContactAt?: Date;
    responseRate?: number;
  };
  gdprConsent: { given: boolean; date: Date; channel: string };
  createdAt: Date;
  updatedAt: Date;
}
```

**API endpoints:**

```
POST  /v1/talent-pool                  Add profile to pool
GET   /v1/talent-pool                  Search/filter pool (text + filters)
POST  /v1/talent-pool/search           Semantic search against open requisitions
GET   /v1/talent-pool/:id              Get profile
PATCH /v1/talent-pool/:id              Update profile, add notes, change tags
POST  /v1/talent-pool/:id/nurture      Enroll in nurture sequence
POST  /v1/talent-pool/bulk-import      Import CSV/ATS dump
```

**Semantic search implementation:**

```typescript
// services/talentPoolService.ts
import Qdrant from "@qdrant/js-client-rest";

async function semanticSearch(
  query: string,
  tenantId: string,
  filters: SearchFilters
): Promise<TalentProfile[]> {
  // 1. Embed query using same model as profiles
  const queryVector = await embed(query);
  // 2. Search Qdrant with tenant_id filter (hard isolation)
  const results = await qdrant.search(`talent_${tenantId}`, {
    vector: queryVector,
    filter: { must: [{ key: "tenantId", match: { value: tenantId } }] },
    limit: filters.limit ?? 20,
  });
  // 3. Return hydrated profiles
  return hydrateProfiles(results);
}
```

---

### 5.3 Referral Program

**New files:**
- `services/referralService.ts`
- `routes/v1/referrals.ts`

**Data model:**

```typescript
interface Referral {
  _id: ObjectId;
  tenantId: string;
  referrerId: string;         // Employee ID
  candidateEmail: string;
  requisitionId?: ObjectId;
  status: "submitted" | "reviewing" | "shortlisted" | "hired" | "rejected";
  bonus?: { amount: number; currency: string; paidAt?: Date };
  notes?: string;
  createdAt: Date;
}
```

**AI integration:** On referral submission, auto-run assessment against all open requisitions and surface best matches to recruiter.

---

### 5.4 Candidate Outreach & Nurture

**New files:**
- `services/outreachService.ts`
- `services/nurture/sequenceEngine.ts`

**Sequence model:**

```typescript
interface NurtureSequence {
  _id: ObjectId;
  tenantId: string;
  name: string;
  triggerEvent: "added_to_pool" | "job_match_found" | "manual";
  steps: NurtureStep[];
}

interface NurtureStep {
  order: number;
  delayDays: number;
  channel: "email" | "sms" | "whatsapp";
  templateId: string;          // AI-personalized template
  condition?: string;          // Skip if candidate opened previous email
}
```

**AI integration:**
- AI personalizes each outreach message from candidate profile + requisition context
- AI suggests optimal send time per candidate based on prior response patterns
- Prompt: `PERSONALIZE_OUTREACH` in `promptRegistry.ts`

---

## 6. Phase 3 — AI Intelligence Deepening

**Timeline:** Months 4–7 (overlaps with Phase 2)  
**Goal:** Make the AI the best recruiter in the room. Compound intelligence with every hire.

---

### 6.1 Predictive Analytics Models

**New files:**
- `services/ai/offerAcceptanceModel.ts`
- `services/ai/timeToFillModel.ts`
- `services/ai/retentionRiskModel.ts`

**Offer acceptance model:**

```typescript
// services/ai/offerAcceptanceModel.ts
interface OfferAcceptancePrediction {
  probability: number;        // 0–1
  confidence: "high" | "medium" | "low";
  drivers: {
    factor: string;
    impact: "positive" | "negative";
    reasoning: string;
  }[];
  recommendations: string[];  // "Increase signing bonus", "Accelerate start date"
}

async function predictOfferAcceptance(
  candidate: TalentProfile,
  offer: Offer,
  marketData: CompensationBenchmark
): Promise<OfferAcceptancePrediction> {
  // Uses LLM reasoning over:
  // - Candidate's career trajectory (are they moving up, lateral, down?)
  // - Compensation vs market median for role/location
  // - Time-in-process (longer = colder candidate)
  // - Interview sentiment signals from scorecards
  // - Historical acceptance patterns for this tenant
}
```

**Time-to-fill prediction:**

```typescript
interface TimeToFillPrediction {
  estimatedDays: number;
  confidenceInterval: [number, number];  // [p25, p75]
  riskFactors: string[];       // "Niche skill set", "Remote-only", "Low market supply"
  recommendations: string[];  // "Expand to 3 job boards", "Lower experience bar by 1 year"
}
```

---

### 6.2 Video Interview Recording & AI Analysis

**New files:**
- `services/videoInterviewService.ts`
- `routes/v1/videoInterviews.ts`

**Integration:** Daily.co or Whereby WebRTC API for recording

```typescript
interface VideoInterviewSession {
  _id: ObjectId;
  tenantId: string;
  interviewId: ObjectId;
  roomUrl: string;
  recordingUrl?: string;       // S3 after completion
  transcript?: string;         // Whisper / Deepgram transcription
  aiAnalysis?: {
    responseQuality: ResponseQualityScore[];  // Per question
    communicationMetrics: CommunicationMetrics;
    keyMoments: { timestamp: number; annotation: string }[];
    overallAssessment: string;
  };
  status: "scheduled" | "in_progress" | "completed" | "analysing" | "ready";
}
```

**Analysis pipeline:**
1. Recording complete → upload to object storage
2. Transcribe via Whisper API (or Deepgram for real-time)
3. Pass transcript + interview questions to LLM for per-question evaluation
4. Extend existing `audioEvaluator.ts` metrics (confidence, pacing, clarity)
5. Store analysis in `aiAnalysis` field — reviewable by recruiter before scorecard

---

### 6.3 RAG Pipeline for Company Documents

**New files:**
- `services/ai/ragService.ts`
- `routes/v1/knowledge.ts`

**Implementation:**

```typescript
// services/ai/ragService.ts
export class RAGService {
  async ingestDocument(
    tenantId: string,
    document: Buffer,
    metadata: DocumentMetadata
  ): Promise<void> {
    // 1. Extract text (PDF/DOCX)
    // 2. Chunk into 512-token segments with overlap
    // 3. Embed each chunk
    // 4. Upsert to Qdrant collection `docs_${tenantId}`
    // Documents: comp bands, role frameworks, company policies, SOPs
  }

  async query(
    tenantId: string,
    question: string,
    context?: ConversationContext
  ): Promise<RAGResponse> {
    // 1. Embed question
    // 2. Retrieve top-K relevant chunks from tenant's collection
    // 3. Pass chunks + question to LLM with citation prompt
    // 4. Return answer with document citations
    // Used by: Recruiter copilot, offer generation, JD suggestions
  }
}
```

**Use cases:**
- "What is our standard notice period for senior engineers?" → answers from HR policy doc
- "What comp band does this candidate fall into?" → answers from salary framework
- "What are our parental leave policies?" → answers from employee handbook

---

### 6.4 Bias Detection Engine

**New files:**
- `services/ai/biasDetector.ts`
- `routes/v1/fairness.ts`

**Implementation:**

```typescript
interface BiasReport {
  requisitionId: ObjectId;
  period: { from: Date; to: Date };
  funnelAnalysis: {
    stage: PipelineStage;
    totalCandidates: number;
    demographics: DemographicBreakdown;   // Inferred, never explicitly collected
    passRate: number;
    deviationFromBaseline?: number;
  }[];
  adverseImpact: {
    detected: boolean;
    groups: string[];
    analysis: string;
    aiConfidence: "high" | "medium" | "low";
  };
  jdLanguageFlags: string[];   // Exclusionary phrases detected in JD
  recommendations: string[];
}
```

**JD language scanner:**

```typescript
// Runs on every JD at submission/approval time
async function scanJDForBias(jdText: string): Promise<JDLanguageFlags[]> {
  // Uses LLM to detect:
  // - Gender-coded language ("rockstar", "ninja", "aggressive")
  // - Age-coded language ("recent graduate", "digital native")
  // - Unnecessary credential inflation ("MBA required" for non-strategic roles)
  // - Cultural exclusion signals
  // Returns flags with suggested rewrites
}
```

---

### 6.5 Per-Tenant Fine-Tune Feedback Loop

**New files:**
- `services/ai/feedbackLoop.ts`

**Implementation:**

```typescript
// Captures: accepted/rejected shortlist decisions + outcomes (hired, quit, fired)
// After N=50 decisions, triggers fine-tune job on Groq/OpenAI
// Produces tenant-specific scoring weights stored in:
//   tenantSettings.aiWeights: { skillMatch: 0.4, experienceDepth: 0.3, evidenceLevel: 0.3 }
// Applied as modifiers to base matching scores

interface TenantAIWeights {
  tenantId: string;
  skillMatch: number;
  experienceDepth: number;
  evidenceLevel: number;
  cultureSignals: number;
  version: number;           // Increments with each fine-tune pass
  trainedOn: number;         // Number of decisions in training set
  calibratedAt: Date;
}
```

---

## 7. Phase 4 — Enterprise Operations & Scale

**Timeline:** Months 6–10  
**Goal:** Production-grade reliability, enterprise sales readiness, SOC 2 posture.

---

### 7.1 Visual Workflow Builder (No-Code Automation)

**New files:**
- `services/workflow/workflowEngine.ts` (replace basic `workflowService.ts`)
- `routes/v1/workflows.ts`
- Frontend: `frontend/src/pages/WorkflowBuilder.tsx`

**Upgrade current `workflowService.ts` to Temporal.io:**

```typescript
// services/workflow/workflowEngine.ts
// Current: simple event-triggered functions
// Target: Temporal.io durable workflows with:
//   - Conditional branching (if role.level === "VP" → add CFO approval step)
//   - SLA enforcement (if no action in 48h → escalate to HR director)
//   - Retry logic (resend email if not opened in 24h)
//   - Cross-system transactions (update ATS + send email + trigger BGV atomically)
//   - Visual representation stored as JSON workflow definition

interface WorkflowDefinition {
  _id: ObjectId;
  tenantId: string;
  name: string;
  trigger: WorkflowTrigger;   // "candidate_shortlisted" | "offer_sent" | "bgv_clear" | ...
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];      // DAG of node connections
  isActive: boolean;
  version: number;
}

interface WorkflowNode {
  id: string;
  type: "action" | "condition" | "delay" | "approval" | "notification" | "integration";
  config: Record<string, unknown>;  // Type-specific config
  position: { x: number; y: number };  // Visual position in builder
}
```

---

### 7.2 Advanced Analytics & BI

**New files:**
- `services/analytics/reportBuilder.ts`
- `services/analytics/dataExporter.ts`
- `routes/v1/reports.ts`
- Frontend: `frontend/src/pages/Reports.tsx`

**Custom report builder:**

```typescript
interface ReportDefinition {
  _id: ObjectId;
  tenantId: string;
  name: string;
  metrics: MetricConfig[];     // Select from library of 50+ metrics
  dimensions: DimensionConfig[]; // Group by: department, location, source, recruiter
  filters: FilterConfig[];
  visualization: "table" | "bar" | "line" | "funnel" | "heatmap";
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
    format: "pdf" | "csv" | "excel";
  };
}
```

**AI narration:**
```typescript
// After report generation, AI generates 3–5 bullet narrative:
// "Your pipeline dropped 20% this week. Primary cause: LinkedIn posting expired 
//  3 days ago for the Senior Engineer role. Additionally, 4 candidates who 
//  reached final interview stage did not proceed — consider reviewing scorecard 
//  consistency between Panel A and Panel B."
```

---

### 7.3 Onboarding Module

**New files:**
- `services/onboardingService.ts`
- `routes/v1/onboarding.ts`
- Frontend: `frontend/src/pages/Onboarding.tsx`

**Data model:**

```typescript
interface OnboardingRecord {
  _id: ObjectId;
  tenantId: string;
  employeeId: string;           // Created when offer accepted
  candidateId: ObjectId;
  requisitionId: ObjectId;
  startDate: Date;
  tasks: OnboardingTask[];
  status: "preboarding" | "day_one" | "first_week" | "first_month" | "completed";
  probationEndDate?: Date;
}

interface OnboardingTask {
  id: string;
  category: "document" | "it_access" | "training" | "meeting" | "compliance";
  title: string;
  assignedTo: "candidate" | "hr" | "manager" | "it";
  dueDate: Date;
  status: "pending" | "completed" | "overdue";
  completedAt?: Date;
}
```

**Trigger:** When BGV clears and offer is signed → auto-create OnboardingRecord from tenant's default task template.

---

### 7.4 Kubernetes & Horizontal Scaling

**New files:**
- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `k8s/hpa.yaml` (Horizontal Pod Autoscaler)
- `k8s/configmap.yaml`
- `k8s/secrets.yaml` (sealed-secrets)

**Key configurations:**

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: reckruit-api
spec:
  scaleTargetRef:
    kind: Deployment
    name: reckruit-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External
      external:
        metric:
          name: bullmq_queue_depth
        target:
          type: AverageValue
          averageValue: "100"  # Scale out when queue depth > 100 jobs/pod
```

**Session stickiness:** Move from in-process `rateLimitMap` (line 74 in `index.ts`) to Redis-based rate limiting — required for multi-pod deployment.

---

### 7.5 Observability Stack

**Add to existing Pino logger:**

```typescript
// utils/telemetry.ts — OpenTelemetry setup
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// Instrument:
// - All HTTP requests (trace per route)
// - All LLM calls (latency, token counts, model used)
// - All DB queries (latency per collection)
// - All queue jobs (processing time, failure rate)
// - All ATS sync operations (success/failure per platform)

// Export to: Datadog / Grafana via OTLP
```

**Add Sentry for error tracking:**

```typescript
// Capture unhandled errors in index.ts catch block
// Add user context (tenantId, userId) to every Sentry event
// Alert on: P50 inference latency > 5s, error rate > 1%, queue backup > 500 jobs
```

---

### 7.6 Multi-Region Data Residency

**Configuration approach:**

```typescript
// utils/mongoClient.ts — region-aware connection
const REGION_CLUSTERS = {
  "in":  process.env.MONGODB_URL_IN,   // India — Mumbai
  "eu":  process.env.MONGODB_URL_EU,   // EU — Frankfurt (GDPR)
  "us":  process.env.MONGODB_URL_US,   // US — Virginia
  "apac": process.env.MONGODB_URL_APAC // Singapore
};

// Tenant settings include: dataResidencyRegion: "in" | "eu" | "us" | "apac"
// All writes for a tenant go to their region cluster
// No cross-region replication for tenant data
```

---

### 7.7 Public API & TypeScript SDK

**New files:**
- `docs/openapi.yaml` (auto-generated from routes using `zod-openapi`)
- `sdk/` — TypeScript client SDK

**API key management:**

```typescript
interface APIKey {
  _id: ObjectId;
  tenantId: string;
  name: string;
  keyHash: string;        // Bcrypt hash — never store plaintext
  prefix: string;         // First 8 chars shown to user: "rk_live_abcd..."
  scopes: APIScope[];     // "assessments:read" | "candidates:write" | "analytics:read"
  rateLimit: number;      // Requests per minute
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
}
```

---

## 8. Phase 5 — Marketplace & Ecosystem

**Timeline:** Months 10–14  
**Goal:** Platform network effects. Partners integrate *into* reckruit.ai.

### 8.1 Integration Marketplace
- Registry of 50+ connectors: payroll (ADP, Darwinbox), HRMS (Workday, SAP HCM), collaboration (Slack, Teams, Notion), assessments (HackerRank, Codility)
- Each connector self-certifies against a test suite
- Marketplace UI: `frontend/src/pages/Marketplace.tsx`

### 8.2 Agency / White-Label (RPO Mode)
- Recruitment agencies manage multiple client tenants under one parent account
- Separate candidate pools per client, shared recruiter pool
- Billing per client, rolled up to agency

### 8.3 Developer API Tier
- Usage-based pricing: per assessment, per candidate-processed, per job-posted
- Webhook manager UI: subscribe to events without code
- OpenAPI-driven SDK generation (TypeScript, Python, Go)

---

## 9. Technical Standards

### Code Standards

```
services/           Business logic only. No HTTP. No DB. Dependency-injected.
routes/v1/          HTTP handlers only. Validate input with Zod. Call services.
utils/              Stateless utilities. Pure functions where possible.
middleware/         Cross-cutting: auth, rate limiting, tenant injection.
types/              Shared TypeScript interfaces. No implementation.
```

**Every service function must:**
1. Accept `tenantId` as first parameter
2. Validate all inputs (Zod schema)
3. Emit structured logs via Pino with `{ tenantId, requestId, action }`
4. Write to audit log via `auditService.ts` for any data modification
5. Store AI outputs with `{ modelId, promptHash, inputSchemaVersion, timestamp }`

### Error Handling Standard

```typescript
// All routes return this shape on error:
interface APIError {
  success: false;
  error: {
    code: string;      // Machine-readable: "CANDIDATE_NOT_FOUND"
    message: string;   // Human-readable
    requestId: string; // For support tracing
  };
}
```

### Zod Validation

```typescript
// All incoming request bodies must be validated with Zod before reaching service layer
// Example pattern:
const CreateOfferSchema = z.object({
  candidateId: z.string().min(1),
  requisitionId: z.string().min(1),
  compensation: z.object({
    base: z.number().positive(),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]),
    // ...
  }),
  startDate: z.string().datetime(),
});

// Usage in route handler:
const body = await req.json();
const parsed = CreateOfferSchema.safeParse(body);
if (!parsed.success) {
  return Response.json({ success: false, error: parsed.error }, { status: 400 });
}
```

---

## 10. Database Schema Additions

### New Collections (Phase 1–2)

```javascript
// requisitions
{
  _id, tenantId, title, department, location, headcount,
  budgetBand: { min, max, currency },
  approvalChain: [{ approverRole, approverId, status, comment, decidedAt }],
  status, linkedJD, hiringManagerId, recruiterId,
  targetHireDate, createdAt, updatedAt
}

// offers
{
  _id, tenantId, candidateId, jobId, requisitionId,
  compensation: { base, currency, bonus, equity, benefits },
  startDate, expiryDate, letterTemplate, generatedLetterUrl,
  status, signingProvider, signingEnvelopeId,
  approvalChain, history, createdBy, createdAt
}

// bgv_requests
{
  _id, tenantId, candidateId, offerId, provider, checks,
  status, providerReferenceId, result, autoDecision,
  recruiterOverride, createdAt
}

// job_postings
{
  _id, tenantId, requisitionId, platform, postingId, url,
  status, variant, metrics, publishedAt, expiresAt
}

// talent_profiles
{
  _id, tenantId, source, sourceDetail, candidate,
  vector, tags, notes, pipeline, nurture,
  gdprConsent, createdAt, updatedAt
}

// referrals
{
  _id, tenantId, referrerId, candidateEmail, requisitionId,
  status, bonus, notes, createdAt
}

// offer_templates
{
  _id, tenantId, name, htmlTemplate, variables,
  isDefault, createdBy, createdAt
}

// onboarding_records
{
  _id, tenantId, employeeId, candidateId, requisitionId,
  startDate, tasks, status, probationEndDate
}

// api_keys
{
  _id, tenantId, name, keyHash, prefix, scopes,
  rateLimit, lastUsedAt, expiresAt, createdBy, createdAt
}
```

### MongoDB Indexes to Add

```javascript
// Performance indexes — add to utils/mongoClient.ts on startup
db.requisitions.createIndex({ tenantId: 1, status: 1 });
db.offers.createIndex({ tenantId: 1, candidateId: 1 });
db.offers.createIndex({ tenantId: 1, status: 1 });
db.talent_profiles.createIndex({ tenantId: 1, "candidate.email": 1 }, { unique: true, sparse: true });
db.talent_profiles.createIndex({ tenantId: 1, tags: 1 });
db.job_postings.createIndex({ tenantId: 1, platform: 1, status: 1 });
db.bgv_requests.createIndex({ tenantId: 1, candidateId: 1 });
db.audit_logs.createIndex({ tenantId: 1, timestamp: -1 });   // Already exists — verify TTL
db.audit_logs.createIndex({ tenantId: 1, action: 1, timestamp: -1 });
```

---

## 11. API Contract Reference

### Route Map (v1 complete)

```
/v1/health                       GET    — Health check
/v1/ready                        GET    — Readiness probe
/v1/metrics                      GET    — Prometheus metrics

/v1/auth/login                   POST   — Email/password login
/v1/auth/register                POST   — Register user
/v1/auth/sso                     POST   — SAML/OIDC SSO
/v1/auth/magic-link              POST   — Send magic link
/v1/auth/api-keys                GET    — List API keys
/v1/auth/api-keys                POST   — Create API key
/v1/auth/api-keys/:id            DELETE — Revoke API key

/v1/requisitions                 GET    — List requisitions
/v1/requisitions                 POST   — Create requisition
/v1/requisitions/:id             GET    — Get requisition
/v1/requisitions/:id             PATCH  — Update requisition
/v1/requisitions/:id/approve     POST   — Approval decision
/v1/requisitions/:id/publish     POST   — Publish to job boards

/v1/jobs                         GET    — List published jobs (internal)
/v1/jobs/:id                     GET    — Single job
/v1/jobs/public                  GET    — Public-facing job listings (no auth)
/v1/jobs/public/:id/apply        POST   — Public application submission

/v1/job-postings                 GET    — List board postings
/v1/job-postings/:id/metrics     GET    — View impressions/applications

/v1/candidates                   GET    — List candidates
/v1/candidates/:id               GET    — Candidate profile
/v1/candidates/:id/resume        POST   — Upload/re-extract resume
/v1/candidates/:id/assess        POST   — Run AI assessment

/v1/talent-pool                  GET    — Search talent pool
/v1/talent-pool                  POST   — Add to talent pool
/v1/talent-pool/:id              PATCH  — Update profile
/v1/talent-pool/:id/nurture      POST   — Enroll in nurture sequence

/v1/referrals                    POST   — Submit referral
/v1/referrals                    GET    — List referrals

/v1/shortlist                    POST   — Run batch match + shortlist
/v1/shortlist/:id/reorder        PATCH  — Manual reorder
/v1/shortlist/:id/pin            POST   — Pin candidate
/v1/shortlist/:id/remove         POST   — Remove with reason

/v1/interviews                   GET    — List interviews
/v1/interviews/schedule          POST   — Schedule interview
/v1/interviews/suggest-times     POST   — Get time suggestions
/v1/interviews/:id/reschedule    POST   — Reschedule
/v1/interviews/:id/cancel        POST   — Cancel
/v1/interviews/:id/video         POST   — Create video room
/v1/interviews/:id/recording     GET    — Get recording + analysis

/v1/scorecards                   POST   — Submit scorecard
/v1/scorecards/:interviewId      GET    — Get scorecard
/v1/scorecards/candidate/:id     GET    — All scorecards for candidate
/v1/scorecards/synthesize        GET    — AI synthesis

/v1/offers                       POST   — Create offer
/v1/offers/:id                   GET    — Get offer
/v1/offers/:id                   PATCH  — Update draft
/v1/offers/:id/send              POST   — Send to candidate
/v1/offers/:id/approve           POST   — Approval decision
/v1/offers/:id/withdraw          POST   — Withdraw
/v1/offers/templates             GET    — List templates
/v1/offers/templates             POST   — Create template

/v1/bgv                          POST   — Initiate BGV
/v1/bgv/:id                      GET    — Get BGV status
/v1/bgv/:id/decide               POST   — Recruiter decision
/v1/bgv/webhook                  POST   — Vendor webhook receiver

/v1/onboarding                   POST   — Create onboarding record
/v1/onboarding/:id               GET    — Get onboarding record
/v1/onboarding/:id/tasks/:taskId PATCH  — Update task status

/v1/workflows                    GET    — List workflow definitions
/v1/workflows                    POST   — Create workflow
/v1/workflows/:id                PATCH  — Update workflow
/v1/workflows/:id/activate       POST   — Activate workflow
/v1/workflows/:id/history        GET    — Workflow execution history

/v1/analytics/kpi                GET    — KPI dashboard
/v1/analytics/roi                GET    — ROI metrics
/v1/analytics/pipeline           GET    — Pipeline funnel
/v1/analytics/source             GET    — Source quality tracking
/v1/analytics/diversity          GET    — Diversity funnel + EEO
/v1/analytics/predictions        GET    — Predictive metrics
/v1/reports                      GET    — List saved reports
/v1/reports                      POST   — Create report definition
/v1/reports/:id/run              POST   — Run report, get data
/v1/reports/:id/export           POST   — Export as PDF/CSV/Excel

/v1/ats/sync                     POST   — Sync to ATS
/v1/ats/platforms                GET    — List connected ATS platforms
/v1/ats/connect                  POST   — Connect new ATS

/v1/privacy/gdpr/:candidateId    DELETE — Right to erasure
/v1/privacy/retention            POST   — Run retention policy
/v1/dpdp/notice                  GET    — DPDP privacy notice
/v1/dpdp/grievance               POST   — File grievance
/v1/compliance/bias-report       GET    — Bias audit report
/v1/compliance/eeo               GET    — EEO compliance report

/v1/settings                     GET    — Tenant settings
/v1/settings                     PATCH  — Update settings
/v1/settings/blind-screening     PATCH  — Toggle blind screening

/v1/knowledge                    POST   — Ingest document (RAG)
/v1/knowledge/query              POST   — Query knowledge base
```

---

## 12. Infrastructure Blueprint

### Local Development (Current)

```yaml
# docker-compose.yml (existing + additions)
services:
  mongodb:     port 27017
  redis:       port 6379
  qdrant:      port 6333   # ADD — vector store
  temporal:    port 7233   # ADD — workflow engine
  mailhog:     port 8025   # ADD — local email testing
```

### Production (Target)

```
┌─────────────────────────────────────────┐
│           CDN / Edge (Cloudflare)        │
│  Static assets, DDoS protection         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Load Balancer (nginx / ALB)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│     Kubernetes Cluster                   │
│  ┌──────────────────────────────────┐   │
│  │  reckruit-api  (2–20 pods, HPA)   │   │
│  │  reckruit-worker (queue consumers)│   │
│  │  reckruit-temporal-worker         │   │
│  └──────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        Managed Data Services             │
│  MongoDB Atlas (region-aware clusters)   │
│  Redis Cluster (ElastiCache / Upstash)   │
│  Qdrant Cloud (tenant-isolated)          │
│  Object Storage (S3 / GCS)              │
└─────────────────────────────────────────┘
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
trigger: push to main

jobs:
  test:
    - bun test (unit + integration)
    - zod schema validation
    - openapi spec validation
  
  security:
    - npm audit
    - SAST scan (Semgrep)
    - Secret scanning (truffleHog)
  
  build:
    - docker build + push to registry
    - tag with git SHA
  
  deploy-staging:
    - helm upgrade reckruit-staging
    - smoke tests against /v1/health
  
  deploy-production:
    - manual approval gate
    - helm upgrade reckruit-prod (rolling update)
    - verify HPA, monitor error rate 5 min
    - auto-rollback if error rate > 2%
```

---

## 13. Testing Strategy

### Test Pyramid

```
E2E Tests (10%)
  - Happy path: requisition → shortlist → interview → offer → BGV → onboard
  - Tools: Playwright

Integration Tests (30%)
  - Every route with real MongoDB + Redis (existing test/  folder)
  - Every ATS connector against sandbox APIs
  - Every LLM call mocked at network level (not service level)

Unit Tests (60%)
  - Every service function
  - Every Zod schema
  - Every AI prompt (deterministic output with seeded model)
  - Every workflow step in isolation
```

### AI-Specific Test Cases

```typescript
// For every AI service, test:
// 1. Happy path — well-formed resume + JD → expected structure
// 2. Malformed input — garbled PDF → graceful error, not LLM hallucination
// 3. Edge cases — 0 skills matched, 20-year gap, internship only
// 4. Prompt regression — new prompt version produces same or better output on golden set
// 5. Reproducibility — same input + prompt hash → same output (temperature=0)
```

---

## 14. Security Checklist

### Before Phase 1 Go-Live

- [ ] Replace in-memory rate limit map (`index.ts:74`) with Redis-backed rate limiter (per tenant, not per IP)
- [ ] Add `helmet` headers (CSP, HSTS, X-Frame-Options)
- [ ] Replace `"Access-Control-Allow-Origin": "*"` with tenant-specific allowed origins
- [ ] Add request signing for webhook endpoints (HMAC signature verification)
- [ ] Move all secrets to environment variables — verify none hardcoded
- [ ] Add per-tenant API key scoping (not all keys can call all routes)
- [ ] Ensure audit log is append-only (no UPDATE/DELETE on audit collection)
- [ ] Add input size limits on file upload endpoints (resume/JD PDF max 10MB)
- [ ] Verify MongoDB indexes include `tenantId` — no query without tenant filter
- [ ] Add SQL injection equivalent protection for MongoDB NL query route (`mongoNLQuery.ts`) — allow only read operations

### Before Phase 4 Go-Live (Enterprise)

- [ ] SOC 2 Type II evidence collection started
- [ ] Penetration test by third party
- [ ] Data residency verified by region per tenant
- [ ] SCIM provisioning for enterprise SSO user management
- [ ] Disaster recovery runbook documented and tested
- [ ] RTO < 1 hour, RPO < 15 minutes for tier-1 tenants

---

## Appendix: Recommended External Services

| Need | Service | Notes |
|------|---------|-------|
| Vector search | Qdrant Cloud | Self-hostable, tenant-isolated collections |
| Durable workflows | Temporal.io Cloud | Replaces basic workflowService |
| E-signature | DocuSign SDK | Enterprise standard; Adobe Sign as fallback |
| BGV (India) | AuthBridge | Best India coverage; API-first |
| BGV (US/Global) | Checkr | Developer-friendly, webhook-first |
| Video interviews | Daily.co | WebRTC, recording, REST API |
| Job boards | Multipost.io | Unified API for 10+ boards |
| SMS/WhatsApp | Twilio | Global; MSG91 as India-cheaper alternative |
| APM | OpenTelemetry → Datadog | Vendor-agnostic instrumentation |
| Feature flags | Unleash (self-hosted) | No SaaS cost; supports targeting by tenantId |
| BI/Reports | Apache Superset | Embeddable, self-hosted, no per-seat cost |
| Transcription | Deepgram | Faster + cheaper than Whisper for real-time |
| Object storage | AWS S3 / Cloudflare R2 | Resumes, offer letters, recordings |

---

*Document maintained by the reckruit.ai engineering team. Update this document when architecture decisions change. Major version bump required for any breaking API change.*
