# reckruit.ai - Product Documentation

## 1. Product Overview

**reckruit.ai** (internally code-named `recruit-hr`) is an enterprise-grade, AI-native Applicant Tracking System (ATS) and recruitment orchestration platform. Designed with a brutalist "Zero-Radius" UI aesthetic, it provides a high-density, forensic interface for hiring managers and recruiters to assess candidates with maximum efficiency and minimum bias.

Unlike traditional ATS platforms that act purely as databases, reckruit.ai operates as an active intelligence layer. It leverages large language models to read resumes, score candidates against job descriptions, conduct initial technical screening via chat, and predict hiring outcomes.

---

## 2. Core Workflows

### 2.1 Requisition & Job Lifecycle
The platform provides a strict, auditable lifecycle for job openings:
1. **Creation**: Hiring managers submit detailed requisitions (title, headcount, budget bands, justification).
2. **Approval Chain**: Multi-step approvals are enforced before a role can be sourced.
3. **Publishing**: Approved requisitions generate SEO-friendly slugs and can be published to the external **Careers Portal**.

### 2.2 External Job Portal & Candidate Intake
- **Public Career Portal**: External candidates can view open roles via a dedicated public URL (`/jobs/:tenantId`).
- **Seamless Application (`/apply/:slug`)**: Candidates upload resumes via a drag-and-drop interface. 
- **AI Ingestion Pipeline**: Upon submission, resumes are instantly parsed, structured into normalized `TalentProfiles`, and placed into the hiring pipeline.

### 2.3 The "Match-First" Assessment Engine
The platform replaces manual resume screening with a predictive matching engine:
- **Batch Processing**: Recruiters can queue hundreds of resumes against a specific Job Description (JD).
- **Copilot Assessment**: The AI generates a detailed scorecard evaluating experience alignment, role relevance, and mandatory skills.
- **Predictive Analytics**: Calculates percentages for Skill Match, Experience Depth, Evidence Level, and Culture Signals.

### 2.4 Candidate Status & Nurture
- **Magic Links**: Applicants receive JWT-backed magic links tracking their application status without requiring account creation.
- **AI Screening Chat**: Candidates can interact with an AI Technical Evaluator that asks pre-screening questions, transcribing answers for the talent team.

---

## 3. Key Feature Modules

| Module | Description | User Persona |
| :--- | :--- | :--- |
| **Requisitions** | Budgeting, approval workflows, and publishing controls for new roles. | Hiring Managers, Admins |
| **Talent Pool** | A centralized, semantic-searchable database of all historical candidates. | Recruiters, Sourcers |
| **Hiring Insights** | Real-time dashboards displaying AI prediction weights and scoring percentages. | Executives, Talent Leaders |
| **Fairness Dashboard** | Bias detection tools scanning JDs and enforcing inclusive language. | HR Business Partners |
| **Job Setup / Workflows** | Configuration of interview stages, automated triggers, and ATS integrations. | Admins |
| **Candidate Portal** | Public-facing status tracker and application flow. | External Candidates |

---

## 4. Technical Architecture

The platform relies on a decoupled architecture optimized for intensive AI workloads and data privacy.

### 4.1 Backend Infrastructure
- **Runtime**: Node.js / Bun
- **Framework**: Hono / Express (Routing logic via `index.ts`)
- **Database**: MongoDB (tenant-isolated collections: `requisitions`, `talent_profiles`, `applications`)
- **Queueing**: BullMQ / Redis (for batch resume processing and AI workloads)

### 4.2 Frontend Architecture
- **Framework**: React 18, React Router v6
- **Styling**: Tailwind CSS (Strict "Zero-Radius" styling, no rounded corners)
- **Component Library**: Custom Radix UI / Shadcn UI implementations
- **State Management**: Context API (`AppContext`, `ThemeContext`)

### 4.3 AI & Intelligence Layer
- **LLM Integration**: Groq API integration (`groqClient.ts`) for near-instant inference.
- **Resume Extraction**: Custom `resumeExtractor.ts` utilizing LayoutParser / OCR fallbacks for complex PDFs.
- **Semantic Search**: Vector embeddings for searching candidates by conceptual skills rather than rigid keywords (`embeddingService.ts`).

---

## 5. Security & Compliance (DPDP Ready)

Built with Indian Digital Personal Data Protection (DPDP) Act and GDPR in mind.

- **Tenant Isolation**: Multi-tenant architecture requiring `tenantId` on all database transactions.
- **Blind Screening**: Features configurable PII redaction (`name`, `email`, `photo`) during the initial screening stages to eliminate unconscious bias.
- **Role-Based Access Control (RBAC)**: Strict separation between `Admin`, `Recruiter`, and `HiringManager` capabilities.
- **Audit Logging**: Immutable audit trails (`AuditService`) for requisition approvals, offer generation, and data exports.

---

## 6. Integrations

The platform features a modular integration layer for legacy ATS synchronization:
- **Supported Targets**: Greenhouse, Darwinbox, Zoho Recruit.
- **Data Push**: Webhook triggers send "Match Scores" and "Synthesized Scorecards" directly to legacy ATS candidate profiles.

---

## 7. Design System

The application strictly adheres to a **Brutalist / Forensic UI**:
- **Borders**: Sharp edges, 0px border-radius across all components.
- **Shadows**: Complete removal of drop shadows; depth is indicated by border colors and solid background shifts.
- **Typography**: High-density data tables, uppercase tracking for labels, monospaced numeric metrics.
- **Color Palette**: Muted zincs and grays punctuated by high-contrast primary colors (Blue for actions, Red for rejections, Green for approvals).
