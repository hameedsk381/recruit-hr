# Reckruit.ai | Product & Feature Guide

Welcome to the official documentation for **Reckruit.ai**, the next-generation AI-powered recruitment orchestration platform. This guide explains the purpose, features, and AI logic behind every page in the application.

---

## 🚀 1. The Intelligence Dashboard (`/dashboard`)
The command center for recruiters. It provides a high-level overview of recruitment health and AI insights.

- **Purpose:** To visualize pipeline velocity and candidate quality.
- **Key Features:**
    - **AI Efficiency Metrics:** Tracks how much time the AI has saved in manual screening.
    - **Global Talent Heatmap:** Visualizes where your top-scoring candidates are coming from.
    - **Active Campaigns:** Real-time status of current batch evaluations.
- **AI Logic:** Aggregates scores from the `assessment_batches` collection to provide a "Quality Index" across the tenant.

## 📄 2. Job Setup & JD Extraction (`/jobs/setup`)
Where every hiring campaign begins. This page transforms raw text or PDFs into structured data.

- **Purpose:** To define the "Ideal Candidate Profile" (ICP) using AI.
- **Key Features:**
    - **PDF Auto-Extraction:** Upload a JD, and the AI extracts skills, requirements, and responsibilities.
    - **Weighted Skills:** Manually adjust the importance (Critical, Important, Nice-to-have) of extracted skills.
    - **ATS Integration:** Import jobs directly from external ATS platforms like Greenhouse or Lever.
- **AI Logic:** Uses `jdExtractor.ts` (Groq/Llama) to parse documents. It cross-verifies against `jdValidator.ts` to ensure the document isn't actually a resume.

## ⚡ 3. Batch Evaluation (`/match`)
The heart of the "Match-First" philosophy. Instead of reading resumes, you let the AI rank them.

- **Purpose:** To screen hundreds of resumes against a JD in seconds.
- **Key Features:**
    - **Bulk Upload:** Drag and drop up to 100 resumes at once.
    - **Real-time Queue:** Watch as the AI processes each resume through the background worker.
    - **Ranking System:** Candidates are instantly sorted by their "Suitability Score."
- **AI Logic:** Resumes are parsed by `pdfParser.ts`, then analyzed by `resumeExtractor.ts`, and finally scored by `jobMatcher.ts`.

## 👤 4. Candidate Detail & Insights (`/candidates/:id`)
A deep-dive into a specific candidate's profile with AI-generated feedback.

- **Purpose:** To provide recruiters with a "Why this person?" summary before they even look at the CV.
- **Key Features:**
    - **AI Executive Summary:** A 3-sentence summary of the candidate's strengths and gaps.
    - **Skill Gap Analysis:** A visual comparison of what the job needs vs. what the candidate has.
    - **Interview Probing Questions:** AI-suggested questions based on the candidate's specific weaknesses.
- **AI Logic:** Uses the detailed evaluation report generated during the matching phase.

## 🌐 5. Public Career Portal (`/p/:tenantId`)
The candidate-facing storefront. Designed for a "Candidate-First" experience.

- **Purpose:** To allow candidates to find their own "Perfect Match" within your company.
- **Key Features:**
    - **Match My Resume:** Candidates upload their resume, and the AI highlights the roles they are most suitable for.
    - **Instant Application:** One-click apply using the AI-extracted data.
    - **Transparent Scoring:** Shows candidates *why* they matched well with a role (e.g., "You have 90% of the required React experience").
- **AI Logic:** Leverages `publicJobs.ts` routes and performs a lightweight match using the same engine as the recruiter portal.

## 🤝 6. Hiring Manager Portal (`/hm/portal`)
The collaboration space for recruiters and HMs to finalize hires.

- **Purpose:** To remove friction between the talent team and the hiring manager.
- **Key Features:**
    - **Shortlist Review:** HMs can "Thumbs Up/Down" candidates suggested by recruiters.
    - **Direct Feedback:** HMs leave notes that are visible to the recruitment team.
    - **Interview Scheduling:** Syncs with calendars to book final-round interviews.
- **AI Logic:** Aggregates feedback to refine the `jobMatcher` weights for future searches.

---

## 🛠 Technical Foundation

### AI Architecture
- **Extraction:** Groq (Llama 3.x) for high-speed document parsing.
- **Vector Search:** Qdrant/RAG for finding similar talent across the entire database.
- **Background Processing:** Bun-native queue system for handling bulk resume uploads without UI lag.

### Security & Privacy
- **CORS Management:** Strict origin control to prevent unauthorized API access.
- **Data Encryption:** All sensitive candidate data is encrypted at rest.
- **Tenant Isolation:** Multi-tenant architecture ensures data from Company A is never visible to Company B.

---

*This guide is maintained by the Engineering Team. For API documentation, see `/docs/api`.*
