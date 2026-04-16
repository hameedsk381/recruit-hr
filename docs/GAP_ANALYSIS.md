# reckruit.ai — Gap Analysis
## Current State vs. Enterprise AI-Native Recruitment Automation OS

**Version:** 1.0  
**Date:** 2026-04-15  
**Audience:** Product, Engineering Leadership, Founders, Investors  
**Companion Document:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

## Executive Summary

reckruit.ai today is a **strong AI-native screening and assessment platform** with best-in-class explainability, compliance foundations, and multi-tenancy. It is **not yet an end-to-end recruitment OS** — it covers roughly **40% of the enterprise hiring lifecycle**, concentrated in the middle of the funnel (screening → shortlisting → interview scheduling).

To become an enterprise production-grade AI-native recruitment automation OS, reckruit.ai must close gaps across three critical dimensions:

1. **Lifecycle Coverage** — sourcing (top of funnel), offer management, background verification, and onboarding (bottom of funnel) are missing entirely.
2. **Enterprise Integrations** — limited ATS coverage (2 platforms), no job boards, no e-signature, no HRIS write-back.
3. **Production Operations** — no horizontal scaling, no API versioning, in-memory rate limiting, no APM, single-region deployment.

**Enterprise readiness score today: 35/100**  
**After Phase 1 (3 months): 60/100**  
**After Phase 4 (10 months): 90/100**

---

## Table of Contents

1. [Methodology](#1-methodology)
2. [Enterprise Readiness Scorecard](#2-enterprise-readiness-scorecard)
3. [Recruitment Lifecycle Coverage](#3-recruitment-lifecycle-coverage)
4. [Functional Gaps — Detailed](#4-functional-gaps--detailed)
5. [Non-Functional Gaps — Detailed](#5-non-functional-gaps--detailed)
6. [Competitive Gap Analysis](#6-competitive-gap-analysis)
7. [Risk Assessment](#7-risk-assessment)
8. [Gap Prioritization Matrix](#8-gap-prioritization-matrix)
9. [Gap-to-Phase Mapping](#9-gap-to-phase-mapping)

---

## 1. Methodology

This gap analysis was conducted by:

1. **Full codebase audit** — Every file under `routes/`, `services/`, `middleware/`, `utils/`, and `frontend/src/` was read and catalogued.
2. **Feature inventory** — All 26 API endpoints and 26 services were classified by maturity (solid / partial / missing).
3. **Enterprise benchmarking** — Compared against 8 enterprise recruitment platforms: Workday Recruiting, Greenhouse, Lever, iCIMS, SmartRecruiters, SAP SuccessFactors Recruiting, Phenom, Eightfold.ai.
4. **Buyer persona review** — Evaluated from the perspective of three procurement gatekeepers: CTO (architecture/security), Head of HR (workflow coverage), and Compliance/Legal (auditability/regulation).

**Status legend:**
- ✅ **Solid** — Production-ready, feature-complete for enterprise
- ⚠️ **Partial** — Exists but missing depth, coverage, or enterprise hardening
- ❌ **Missing** — Not implemented
- 🔴 **Critical gap** — Deal-blocker for enterprise sales
- 🟡 **High gap** — Competitive disadvantage
- 🟢 **Medium/low gap** — Nice-to-have or phase-3+

---

## 2. Enterprise Readiness Scorecard

| Dimension | Weight | Today | Target | Score (Today) | Score (Target) |
|-----------|-------:|------:|-------:|--------------:|---------------:|
| Lifecycle Coverage | 20% | 40% | 100% | 8/20 | 20/20 |
| AI Capability | 15% | 70% | 95% | 10.5/15 | 14.3/15 |
| Integration Breadth | 15% | 20% | 90% | 3/15 | 13.5/15 |
| Sourcing | 10% | 0% | 85% | 0/10 | 8.5/10 |
| Analytics & BI | 10% | 30% | 85% | 3/10 | 8.5/10 |
| Compliance | 10% | 60% | 95% | 6/10 | 9.5/10 |
| Reliability & SRE | 10% | 30% | 90% | 3/10 | 9/10 |
| Security Posture | 5% | 50% | 95% | 2.5/5 | 4.75/5 |
| Enterprise UX | 5% | 50% | 85% | 2.5/5 | 4.25/5 |
| **TOTAL** | **100%** | — | — | **38.5/100** | **92.3/100** |

---

## 3. Recruitment Lifecycle Coverage

### The Enterprise Hiring Lifecycle (12 stages)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. WORKFORCE PLANNING         → ❌ Missing         Critical    │
│  2. JOB REQUISITION & APPROVAL → ❌ Missing         Critical    │
│  3. SOURCING                   → ❌ Missing         Critical    │
│  4. APPLICATION INTAKE         → ✅ Built            —          │
│  5. SCREENING & MATCHING       → ✅ Built (strong)   —          │
│  6. SHORTLISTING               → ✅ Built (strong)   —          │
│  7. INTERVIEW SCHEDULING       → ✅ Built            —          │
│  8. ASSESSMENTS & EVALUATIONS  → ⚠️ Partial          Medium     │
│  9. OFFER MANAGEMENT           → ❌ Missing         Critical    │
│  10. BACKGROUND VERIFICATION   → ❌ Missing         Critical    │
│  11. ONBOARDING                → ❌ Missing         High        │
│  12. ANALYTICS & REPORTING     → ⚠️ Partial          High       │
└─────────────────────────────────────────────────────────────────┘

Coverage: 4 of 12 stages fully built (33%)
Weighted coverage: ~40% (some partial coverage in #8, #12)
```

### Coverage Visualization

```
Stage:      1    2    3    4    5    6    7    8    9    10   11   12
Today:      ░░   ░░   ░░   ██   ██   ██   ██   ▓▓   ░░   ░░   ░░   ▓▓
Phase 1:    ░░   ██   ░░   ██   ██   ██   ██   ▓▓   ██   ██   ░░   ▓▓
Phase 2:    ░░   ██   ██   ██   ██   ██   ██   ▓▓   ██   ██   ░░   ▓▓
Phase 4:    ▓▓   ██   ██   ██   ██   ██   ██   ██   ██   ██   ██   ██

██ = Full coverage   ▓▓ = Partial coverage   ░░ = Missing
```

---

## 4. Functional Gaps — Detailed

### 4.1 Workforce Planning & Requisition 🔴 CRITICAL

**Current state:** No module exists. Hiring starts only when someone uploads a JD PDF.

**Missing capabilities:**
- Headcount planning & budget tracking
- Job requisition creation workflow
- Multi-step approval chains (Hiring Manager → Dept Head → Finance → CEO)
- Position management (open / filled / frozen / cancelled)
- Requisition-to-JD linking
- AI-suggested JD drafts from past similar roles

**Business impact:**
- Enterprise finance teams cannot approve hires without budget-linked requisitions
- Hiring managers must create JDs outside the system, then re-upload
- No traceability from "we need a hire" to "we made a hire"

**What enterprise buyers expect:** Workday, SAP SuccessFactors, Greenhouse all have this as Day-1 functionality.

**Severity:** 🔴 Deal-blocker for mid-market and enterprise sales.

---

### 4.2 Sourcing & Top-of-Funnel 🔴 CRITICAL

**Current state:** Reactive only. Candidates must find and apply; platform cannot proactively find them.

**Missing capabilities:**

| Capability | Status | Impact |
|------------|:-----:|--------|
| Job board publishing (LinkedIn, Indeed, Naukri, Glassdoor) | ❌ | Cannot distribute roles |
| Talent pool / CRM for candidates | ❌ | No reusable candidate database |
| Semantic search over talent pool | ❌ | Cannot find "silver medal" candidates |
| Boolean search | ❌ | No recruiter-friendly search |
| Passive candidate outreach (cold email sequences) | ❌ | No active sourcing |
| Referral program | ❌ | Missing ~30% of typical hires |
| Social recruiting (LinkedIn import) | ❌ | No profile enrichment |
| Source attribution through funnel | ❌ | Cannot measure sourcing ROI |

**Business impact:**
- Platform cannot be a system of record for candidate relationships
- Re-engagement of previous applicants is manual
- Referral programs (often 20–40% of enterprise hires) run outside the platform

**Severity:** 🔴 Without sourcing, reckruit.ai is a screening tool, not a recruitment OS. This is the single biggest gap to the "OS" positioning.

---

### 4.3 Offer Management & E-Signature 🔴 CRITICAL

**Current state:** No offer module. Hiring ends at "hired in scorecard"; everything after is manual.

**Missing capabilities:**
- Offer letter generation from templates
- Compensation band benchmarking
- Multi-step offer approval workflows
- E-signature integration (DocuSign, Adobe Sign)
- Offer status tracking (sent → viewed → accepted/declined/expired)
- Counter-offer negotiation tracking
- Offer withdrawal workflows
- Offer acceptance probability prediction

**Business impact:**
- The most critical closing step happens outside the platform
- No single source of truth for offer history
- No data to train acceptance models

**Severity:** 🔴 Enterprise deal-blocker. Procurement will not approve a recruitment platform that cannot send and track offers.

---

### 4.4 Background Verification (BGV) 🔴 CRITICAL

**Current state:** No BGV module.

**Missing capabilities:**
- BGV vendor integrations: AuthBridge (India), Checkr (US), IDfy, Sterling
- BGV workflow orchestration (initiate → status → result → decision)
- Document collection (ID proof, certificates, addresses, references)
- Check types: identity, employment, education, criminal, credit, address
- Auto-proceed / hold / reject logic based on results
- Recruiter override with justification (captured in audit log)

**Business impact:**
- Enterprise compliance teams require BGV gate before offer-to-onboard transition
- Regulated industries (BFSI, healthcare, public sector) legally mandate BGV
- Manual BGV tracking in spreadsheets is common today — a major friction point

**Severity:** 🔴 Required for regulated industries (BFSI, healthcare, pharma, public sector).

---

### 4.5 Onboarding 🟡 HIGH

**Current state:** Lifecycle ends at hire. No preboarding, no Day-1 experience.

**Missing capabilities:**
- Preboarding portal (candidate fills forms before Day 1)
- IT/access provisioning triggers (JIRA / ServiceNow tickets)
- Onboarding task checklist (HR, manager, IT, candidate)
- Day-1 orientation scheduling
- Document management (offer letter, NDA, policies)
- Probation tracking and reviews
- Buddy/mentor assignment

**Business impact:**
- First 90 days account for the majority of early attrition
- Enterprise HR teams expect unified hire-to-onboard experience
- Opportunity for significant customer lifetime value expansion

**Severity:** 🟡 Not a deal-blocker, but a significant competitive gap.

---

### 4.6 ATS & HRIS Integration Depth 🔴 CRITICAL

**Current state:** Two ATS connectors (Zoho Recruit, Darwinbox). Push-only; no bidirectional sync. No HRIS integration.

**Missing ATS platforms:**
- Workday Recruiting (global enterprise standard)
- Greenhouse (mid-market US standard)
- Lever (growth companies)
- iCIMS (enterprise)
- SmartRecruiters
- BambooHR (SMB/mid-market)
- SAP SuccessFactors Recruiting

**Missing HRIS platforms:**
- Workday HCM
- SAP SuccessFactors
- Oracle HCM
- BambooHR
- ADP Workforce Now

**Missing integration capabilities:**
- Bidirectional sync (read jobs + candidates, not just push assessments)
- Real-time webhooks from ATS (stage change events)
- Employee record creation in HRIS on hire
- Delta sync (only changed records, not full replays)
- Field mapping UI (map reckruit fields to custom ATS fields)

**Business impact:**
- "Sits beside your ATS" positioning requires breadth
- Enterprises rarely replace their ATS — they augment it
- Each missing integration = a lost opportunity

**Severity:** 🔴 Deal-blocker for any enterprise already using Workday/Greenhouse/Lever.

---

### 4.7 Advanced Assessments 🟡 HIGH

**Current state:** MCQ generation, voice interview questions, audio evaluation. Good for pre-interview.

**Missing capabilities:**
- Live coding assessment integration (HackerRank, Codility, CoderPad)
- Take-home assignment management (distribution, collection, AI evaluation)
- Video interview recording + AI analysis (not just voice)
- Psychometric / personality assessments (Big Five, DISC)
- Role-specific simulations (sales role-play, customer support scenarios)
- Proctoring for remote assessments (anti-cheat detection)
- Code execution sandbox

**Business impact:**
- Technical hiring requires coding tests — currently forces customers to use separate tools
- Video interview analysis is becoming table stakes (all competitors have it)

**Severity:** 🟡 Strong competitive pressure from HireVue, iCIMS Video, Eightfold.

---

### 4.8 Communication Orchestration 🟢 MEDIUM

**Current state:** Email-only via Resend. Transactional only (interview invites, cancellations).

**Missing capabilities:**
- SMS outreach (Twilio, MSG91)
- WhatsApp Business API (dominant channel in India, LATAM)
- Slack integration (internal notifications to hiring team)
- Microsoft Teams integration (enterprise standard)
- Automated drip sequences (nurture sequences)
- Bulk communication with AI personalization
- Inbound reply handling (shared inbox for candidate replies)
- Template management UI

**Business impact:**
- Email-only is insufficient for high-volume hiring (blue-collar, retail, BPO)
- WhatsApp is primary channel for Indian candidates
- Internal notifications to hiring teams via Slack/Teams is expected

**Severity:** 🟢 Important for specific verticals (retail, BPO, India market).

---

### 4.9 Predictive Analytics & BI 🟡 HIGH

**Current state:** Basic KPIs (hiring velocity, conversion rates, ROI). Dashboard only — no flexibility.

**Missing capabilities:**

| Capability | Status | Impact |
|------------|:-----:|--------|
| Offer acceptance probability | ❌ | No forward-looking insight |
| Time-to-fill prediction | ❌ | Cannot set realistic expectations |
| Source quality ranking over time | ❌ | Cannot optimize sourcing spend |
| Predictive attrition scoring | ❌ | Cannot flag risky hires |
| Recruiter performance analytics | ❌ | Cannot manage recruiter team |
| Custom report builder | ❌ | Every new metric = engineering work |
| Scheduled exports (CSV, PDF, Excel) | ❌ | Executives cannot subscribe to reports |
| Data warehouse connector (Snowflake, BigQuery) | ❌ | Cannot integrate with central BI stack |
| Diversity funnel + EEO reporting | ❌ | Legal/compliance gap (US) |
| Cost-per-hire tracking with source attribution | ❌ | Cannot justify recruiting budget |

**Business impact:**
- Analytics is how VPs of Talent Acquisition justify budget
- Enterprise buyers ask "can we pipe this to Snowflake?" — today: no
- Predictive models are a key AI-native differentiator

**Severity:** 🟡 Competitive disadvantage vs. Eightfold.ai, Phenom, Beamery.

---

### 4.10 Bias, Fairness & EEO Compliance 🟡 HIGH

**Current state:** Audit log infrastructure exists. GDPR/DPDP basic support. No active fairness controls.

**Missing capabilities:**
- Blind screening mode (hide PII during initial review)
- Diversity funnel tracking (drop-off rates by demographic at each stage)
- EEO/EEOC reporting (US federal requirement for some employers)
- Adverse impact analysis (4/5ths rule validation)
- AI bias detection (periodic audits of model outputs)
- JD language scanner (detect exclusionary phrasing)
- Explainability reports for rejected candidates (legal defense)
- Disparate impact dashboards per requisition

**Business impact:**
- US enterprises with 100+ employees face EEO-1 reporting obligations
- EU enterprises face GDPR automated-decision provisions
- India DPDP 2023 has anti-discrimination implications
- Recent AI Act (EU) requires high-risk AI systems to document bias controls

**Severity:** 🟡 Regulatory risk; will become 🔴 CRITICAL as AI regulation matures.

---

### 4.11 Workflow Automation 🟡 HIGH

**Current state:** Basic event-triggered workflows (shortlisted → email → schedule). Hardcoded logic.

**Missing capabilities:**
- Visual workflow builder (no-code drag-and-drop)
- Conditional branching (if VP role → add CFO approval)
- SLA enforcement (escalate if no action in 48h)
- Retry logic with exponential backoff
- Cross-system transactions (update ATS + send email + create task atomically)
- Workflow versioning and rollback
- Workflow execution history and replay
- Durable execution (survive server restarts)

**Business impact:**
- Enterprise TA ops want to customize workflows without engineering
- Current workflow logic cannot handle complex approval chains
- Failures mid-workflow leave inconsistent state

**Severity:** 🟡 Needed for enterprise ops teams; nice-to-have for SMB.

---

### 4.12 Mobile & Accessibility 🟢 MEDIUM

**Current state:** Web-only React frontend. No native mobile apps. Accessibility unaudited.

**Missing capabilities:**
- Native iOS app (hiring managers reviewing on-the-go)
- Native Android app (candidates applying from mobile, India market priority)
- PWA capabilities (offline application drafts)
- WCAG 2.1 AA compliance audit
- Screen reader support verification
- Keyboard navigation audit

**Business impact:**
- 70%+ of candidate applications in India/SEA come from mobile devices
- Hiring manager mobile app drives faster decisions → shorter time-to-hire
- Accessibility is legally required (ADA in US, EN 301 549 in EU)

**Severity:** 🟢 Important but can launch with strong responsive web first.

---

## 5. Non-Functional Gaps — Detailed

### 5.1 Reliability & Horizontal Scaling 🔴 CRITICAL

**Problems in current codebase:**

| Issue | Location | Risk |
|-------|----------|------|
| In-memory rate limiter | `index.ts:74` (`rateLimitMap = new Map`) | Breaks in multi-pod deployment |
| Wildcard CORS | `index.ts:110` (`"Access-Control-Allow-Origin": "*"`) | Security risk in production |
| Single MongoDB connection | `utils/mongoClient.ts` | No connection pooling strategy documented |
| No circuit breakers | LLM, ATS calls | Cascading failure risk |
| Background jobs in process | `setInterval` in `index.ts:523` | Duplicated if multi-pod |
| No graceful shutdown | `index.ts` | In-flight requests dropped on restart |

**Missing infrastructure:**
- Kubernetes manifests (Deployment, Service, HPA)
- Load balancer configuration
- Connection pooling (MongoDB driver configured, but no tuning docs)
- Redis-based rate limiting
- Redis-based session storage
- Horizontal pod autoscaling on queue depth
- Multi-AZ / multi-region deployment

**Severity:** 🔴 Cannot ship to enterprise production without fixing these.

---

### 5.2 Observability 🟡 HIGH

**Current state:** Pino structured logging. Custom log-request function. No distributed tracing, no APM.

**Missing:**
- Distributed tracing (OpenTelemetry)
- APM integration (Datadog, New Relic, Sentry)
- Structured error tracking (currently `console.error`)
- Metrics endpoint (`/metrics` in Prometheus format)
- Alert rules and playbooks
- Performance monitoring (P50, P95, P99 latency per route)
- Log aggregation (Loki, ELK, or SaaS)
- SLO/SLI definitions and burn-rate alerts

**Severity:** 🟡 Required before enterprise production.

---

### 5.3 API Standards 🔴 CRITICAL

**Current state:** Unversioned routes. No OpenAPI spec. No public SDK.

**Issues:**
- No `/v1` prefix → cannot evolve API without breaking customers
- No OpenAPI 3.1 specification → enterprise IT cannot review contracts
- No TypeScript SDK for enterprise self-integration
- No API key management (all access via JWT session tokens)
- No webhook subscription management
- Inconsistent response shapes across routes (some `{ success, data }`, some raw objects)

**Severity:** 🔴 Enterprise IT will reject unversioned APIs.

---

### 5.4 Security Posture 🟡 HIGH

**Good foundations:**
- JWT authentication (`middleware/authMiddleware.ts`)
- RBAC roles (Recruiter, HM, Admin, Compliance)
- Per-tenant audit logs
- PII redaction utilities

**Gaps:**

| Gap | Severity |
|-----|----------|
| No security headers (CSP, HSTS, X-Frame-Options) | 🟡 |
| CORS wildcarded | 🟡 |
| No HMAC signature verification on webhooks | 🟡 |
| MongoDB NL query (`mongoNLQuery.ts`) — potential injection | 🔴 |
| No request size limits on file uploads | 🟡 |
| No SAST/DAST in CI | 🟡 |
| No dependency vulnerability scanning | 🟡 |
| No secret rotation policy | 🟡 |
| No SOC 2 evidence collection | 🟡 |
| No penetration test on record | 🟡 |

**Severity:** 🟡 All must be addressed before Phase 4 enterprise launch.

---

### 5.5 Data Management & Residency 🟡 HIGH

**Current state:** Single MongoDB instance. Tenant isolation is logical (tenant_id filtering).

**Gaps:**
- No multi-region data residency (GDPR requires EU data stays in EU)
- No physical isolation tier for enterprise tenants
- No backup strategy documented
- No disaster recovery runbook
- No RTO/RPO commitments
- No data export for tenants (own-your-data portability)
- No BYOK (Bring Your Own Key) encryption tier

**Severity:** 🟡 Required for EU enterprise sales and regulated industries.

---

### 5.6 AI Governance Depth 🟢 MEDIUM

**Current state:** Prompt registry exists. Model outputs include version metadata. Hybrid LLM routing.

**Gaps:**
- No model evaluation framework (golden test set per prompt)
- No A/B testing infrastructure for prompts
- No model drift detection
- No human-feedback loop to improve prompts
- No fine-tuned tenant-specific models
- No explainability API for rejected candidates (legal defense)
- No AI-output caching strategy beyond basic Redis
- No token-usage tracking per tenant (cost allocation)

**Severity:** 🟢 Foundations are strong; these are maturity improvements.

---

## 6. Competitive Gap Analysis

### Feature Coverage vs. Enterprise Competitors

| Feature Category | reckruit.ai Today | Greenhouse | Workday | Eightfold.ai | Phenom |
|------------------|:----------------:|:----------:|:-------:|:------------:|:------:|
| Requisition management | ❌ | ✅ | ✅ | ✅ | ✅ |
| Sourcing (job boards) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Talent CRM | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| AI matching & scoring | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| Explainable AI | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |
| Interview scheduling | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scorecards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video interviews + AI | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| Offer management | ❌ | ✅ | ✅ | ⚠️ | ⚠️ |
| E-signature | ❌ | ✅ | ✅ | ⚠️ | ⚠️ |
| BGV integration | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| Onboarding | ❌ | ⚠️ | ✅ | ❌ | ⚠️ |
| Predictive analytics | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |
| Custom reports | ❌ | ✅ | ✅ | ✅ | ✅ |
| Bias detection | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| GDPR/DPDP compliance | ✅ | ✅ | ✅ | ✅ | ✅ |
| ATS integrations | ⚠️ (2) | N/A (is ATS) | N/A (is ATS) | ✅ (20+) | ✅ (15+) |
| Mobile apps | ❌ | ✅ | ✅ | ✅ | ✅ |
| Public API & SDK | ❌ | ✅ | ✅ | ✅ | ✅ |

### Where reckruit.ai Leads

- **Explainability** — Evidence-based assessments with strengths, gaps, and interview probes are rare. Most competitors hide scores behind opaque "fit" percentages.
- **Human-in-the-loop UX** — "Language over numbers" philosophy is differentiated.
- **Prompt versioning & reproducibility** — Few competitors expose this.
- **Compliance-first design** — DPDP (India) support is ahead of global competitors.

### Where reckruit.ai Lags

- **Breadth** — 6 stages of 12 are missing (top and bottom of funnel)
- **Integration ecosystem** — 2 ATS connectors vs. 15+ at competitors
- **Sourcing** — Completely absent, while all competitors have some form
- **Mobile** — Web-only is a disadvantage in mobile-first markets
- **Predictive AI** — No forward-looking models yet

---

## 7. Risk Assessment

### Deal-Blocking Risks (must solve in Phase 1)

| Risk | Likelihood | Impact | Mitigation Phase |
|------|:----------:|:------:|:----------------:|
| Enterprise procurement rejects unversioned API | High | Critical | Phase 1.1 |
| Cannot close offers in-platform → lost deals | High | Critical | Phase 1.3 |
| No BGV → ineligible for regulated industries | High | Critical | Phase 1.4 |
| No Greenhouse/Workday connector → lost mid-market deals | High | Critical | Phase 1.6 |
| In-memory rate limiter → cannot scale horizontally | Certain | High | Phase 1 (fix during API versioning work) |
| Wildcard CORS → security review failure | Certain | High | Phase 1 |

### Competitive Risks (Phase 2–3)

| Risk | Likelihood | Impact | Mitigation Phase |
|------|:----------:|:------:|:----------------:|
| No sourcing → positioned as "screening tool" not "OS" | High | High | Phase 2 |
| No predictive analytics → loses to Eightfold.ai in TA analytics | Medium | High | Phase 3 |
| No video AI → loses to HireVue, Phenom | Medium | Medium | Phase 3 |
| No custom reports → blocks enterprise BI requirements | High | Medium | Phase 4 |

### Regulatory Risks (ongoing)

| Risk | Likelihood | Impact | Mitigation Phase |
|------|:----------:|:------:|:----------------:|
| EU AI Act compliance (high-risk AI classification) | Certain by 2027 | High | Phase 3–4 |
| US EEO-1 reporting required by enterprise customers | High | Medium | Phase 3 |
| NYC Local Law 144 (bias audit for AI hiring tools) | Applies now | Medium | Phase 3 |
| India DPDP rules finalization | Ongoing | Medium | Already addressed |

---

## 8. Gap Prioritization Matrix

```
                     HIGH IMPACT (Revenue-blocking or core moat)
                                    │
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    │     PHASE 2                   │          PHASE 1               │
    │  (Competitive moat)           │    (Deal-blockers)             │
    │                               │                               │
    │  • Job board publishing       │  • Job requisitions            │
    │  • Talent pool + CRM          │  • Offer management + e-sign   │
    │  • Semantic search            │  • BGV integration             │
    │  • Referral program           │  • ATS expansion               │
    │  • Nurture sequences          │  • API versioning              │
    │                               │  • Blind screening             │
    │                               │  • Fix rate limiter + CORS     │
    │                               │                               │
    LOW EFFORT ──────────────────────────────────────────── HIGH EFFORT
    │                               │                               │
    │                               │                               │
    │     PHASE 3                   │         PHASE 4                │
    │   (AI moat)                   │     (Enterprise scale)         │
    │                               │                               │
    │  • RAG over company docs      │  • Visual workflow builder     │
    │  • Bias detection             │  • Custom report builder       │
    │  • Offer acceptance model     │  • Kubernetes + HPA            │
    │  • Time-to-fill prediction    │  • Multi-region data residency │
    │  • Video interview AI         │  • Onboarding module           │
    │  • Per-tenant fine-tuning     │  • Public API + SDK            │
    │                               │  • SOC 2 Type II               │
    │                               │  • Mobile apps                 │
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
                                    │
                     LOW IMPACT (Nice to have)
```

---

## 9. Gap-to-Phase Mapping

| Gap | Severity | Phase | Estimated Effort | Blocker For |
|-----|:--------:|:-----:|:----------------:|-------------|
| Job requisition module | 🔴 | P1 | 4 weeks | Finance-approved hiring |
| Offer management | 🔴 | P1 | 5 weeks | Enterprise sales closure |
| E-signature (DocuSign) | 🔴 | P1 | 2 weeks | Offer module |
| BGV integrations | 🔴 | P1 | 4 weeks | Regulated industries |
| ATS expansion (Greenhouse, Lever, Workday, BambooHR) | 🔴 | P1 | 6 weeks | Mid-market / enterprise sales |
| API versioning (`/v1`) | 🔴 | P1 | 1 week | Enterprise IT approval |
| Health/metrics endpoints | 🔴 | P1 | 1 week | Enterprise SRE approval |
| Blind screening | 🟡 | P1 | 2 weeks | Bias / fairness requirements |
| Fix rate limiter (Redis) | 🔴 | P1 | 1 week | Multi-pod deployment |
| Fix CORS wildcard | 🔴 | P1 | 1 day | Security review |
| Job board publishing | 🔴 | P2 | 6 weeks | "OS" positioning |
| Talent pool + CRM | 🔴 | P2 | 5 weeks | "OS" positioning |
| Semantic search (Qdrant) | 🟡 | P2 | 3 weeks | Talent pool |
| Referral program | 🟡 | P2 | 3 weeks | ~30% of hires |
| Nurture sequences | 🟡 | P2 | 3 weeks | Candidate re-engagement |
| SMS / WhatsApp | 🟢 | P2 | 2 weeks | High-volume hiring |
| Offer acceptance model | 🟡 | P3 | 4 weeks | Predictive analytics |
| Time-to-fill prediction | 🟡 | P3 | 3 weeks | Predictive analytics |
| Video interview AI | 🟡 | P3 | 6 weeks | Competitive parity |
| RAG pipeline | 🟡 | P3 | 4 weeks | AI assistant depth |
| Bias detection engine | 🟡 | P3 | 5 weeks | Compliance maturity |
| Per-tenant fine-tuning | 🟢 | P3 | 4 weeks | AI moat |
| Visual workflow builder | 🟡 | P4 | 8 weeks | Enterprise ops |
| Custom report builder | 🟡 | P4 | 6 weeks | Enterprise BI |
| Onboarding module | 🟡 | P4 | 6 weeks | Lifecycle extension |
| Kubernetes + HPA | 🔴 | P4 | 3 weeks | Production scale |
| Multi-region data residency | 🟡 | P4 | 4 weeks | EU sales |
| APM (OpenTelemetry + Datadog) | 🟡 | P4 | 2 weeks | Enterprise SLA |
| Public API + SDK | 🟡 | P4 | 4 weeks | Platform positioning |
| Mobile apps (iOS + Android) | 🟢 | P4 | 10 weeks | Mobile-first markets |
| SOC 2 Type II | 🟡 | P4 | 6 months | Enterprise trust |

---

## Summary of Critical Findings

**Top 5 gaps to close first (Phase 1, Month 1):**

1. ⚠️ **Fix `index.ts:74` in-memory rate limiter** — breaks multi-pod deployment (1 day)
2. ⚠️ **Fix `index.ts:110` CORS wildcard** — security review failure (1 day)
3. 🔴 **API versioning (`/v1` prefix)** — enterprise IT blocker (1 week)
4. 🔴 **Job requisition module** — upstream trigger for hiring (4 weeks)
5. 🔴 **Offer management + DocuSign** — closes the lifecycle (7 weeks total)

**Top 3 strategic moats to build (Phase 2–3):**

1. 🎯 **Sourcing engine** (talent pool + job boards + semantic search) — the difference between "screening tool" and "recruitment OS"
2. 🎯 **Predictive AI suite** (offer acceptance, time-to-fill, retention risk) — leapfrogs traditional ATS competitors
3. 🎯 **Per-tenant fine-tune loop** — compounding AI advantage that competitors cannot easily replicate

**Biggest existential risk:** Without sourcing (Phase 2), reckruit.ai will be perceived and positioned as a screening add-on, not a core system of record. Enterprise buyers will keep their ATS as the source of truth, limiting reckruit.ai to a tactical tool with low strategic stickiness.

---

*This gap analysis should be reviewed quarterly and updated as features ship, competitors evolve, and regulatory landscape changes. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed execution plan.*
