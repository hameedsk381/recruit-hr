# reckruit.ai - Frontend Architecture

## Product Overview

**Product:** reckruit.ai  
**Audience:** Professional recruiters hiring under time pressure  
**Goal:** Reduce cognitive load and enable fast, defensible shortlisting

---

## UX Principles (Non-Negotiable)

| Principle | Implementation |
|-----------|----------------|
| **Language over numbers** | No scores, percentages, grades. Clear text: strengths, risks, gaps. |
| **Explain first, rank second** | Every ranking shows inline reasoning via "Why ranked here" links. |
| **No hidden intelligence** | AI assumptions are always visible. AI-generated content is labeled. |
| **Recruiter stays in control** | Drag-to-reorder, pin, remove with reason, editable notes. |
| **One screen = one question** | Each screen answers one specific question. |

---

## Screen Architecture

### 1. Job Setup Screen (`/pages/JobSetup.tsx`)

**Question Answered:** "What does this job require?"

**Sections:**
- Role Title (editable)
- Skills with Required/Optional toggle and Weight slider (Critical/Important/Nice)
- Experience Expectation (editable number)
- AI Assumptions box (read-only, visible)

**Key Features:**
- PDF upload extracts job requirements
- All AI interpretations are visible and overridable
- No auto-locking of JD interpretation

---

### 2. Shortlist Screen (`/pages/Shortlist.tsx`) — MOST IMPORTANT

**Question Answered:** "Who should I consider?"

**Each Candidate Card Shows:**
- Name
- One-line AI-generated summary
- Top 2 strengths (badges)
- Top 1 risk (badge)
- "Why ranked here" link

**Interactions:**
- **Drag** to reorder rankings
- **Pin** candidate (stays at top)
- **Remove** candidate (requires reason)
- Filter by experience, skills

**Design Decisions:**
- No numeric scores visible to recruiter
- Filters accessible, not hidden behind menus
- Removed candidates logged but accessible

---

### 3. Candidate Detail Screen (`/pages/CandidateDetail.tsx`)

**Question Answered:** "Should I interview this person?"

**Sections (top to bottom):**
1. **Summary** (5-6 lines max)
2. **Strengths** with evidence tags (Claimed/Demonstrated/Production)
3. **Gaps & Risks** (visually separated)
4. **Skill Match Breakdown** (Strong/Partial/None coverage)
5. **Interview Focus Areas** (topic + sample probe question)
6. **Recruiter Notes** (editable)

**Evidence Level Legend:**

| Level | Meaning |
|-------|---------|
| Production | Used in live systems with measurable outcomes |
| Demonstrated | Used in projects, interviews, or assessments |
| Claimed | Listed without supporting evidence |

---

### 4. Copilot Panel (`/components/CopilotPanel.tsx`)

**Purpose:** Replace manual note-taking and mental comparisons.

**Allowed Actions:**
- Summarize candidate for hiring manager
- Compare two candidates
- Generate interview probes
- Clarify a risk or gap

**Rules:**
- Responses reference only visible data
- Copilot never auto-takes action
- All actions are logged
- Responses include citations

---

## Component Structure

```
src/
├── api/
│   └── client.ts           # API client with typed endpoints
├── components/
│   ├── CopilotPanel.tsx    # AI assistant side panel
│   └── CopilotPanel.css
├── context/
│   └── AppContext.tsx      # Global state management
├── pages/
│   ├── JobSetup.tsx        # Job requirements setup
│   ├── JobSetup.css
│   ├── Shortlist.tsx       # Candidate ranking (MAIN SCREEN)
│   ├── Shortlist.css
│   ├── CandidateDetail.tsx # Individual candidate view
│   └── CandidateDetail.css
├── types/
│   └── index.ts            # TypeScript interfaces
├── App.tsx                  # Main app with routing
├── App.css
├── index.css                # Design system / CSS variables
└── main.tsx                 # Entry point
```

---

## Design System

### Color Palette (Neutral, Professional)

```css
/* Backgrounds */
--color-bg-primary: #ffffff;
--color-bg-secondary: #f8f9fa;
--color-bg-tertiary: #f1f3f5;

/* Text */
--color-text-primary: #212529;
--color-text-secondary: #495057;
--color-text-tertiary: #868e96;

/* Semantic (Subtle, not aggressive) */
--color-strength: #2b8a3e;
--color-risk: #c92a2a;

/* Evidence Levels */
--color-production: #1864ab;
--color-demonstrated: #5c940d;
--color-claimed: #868e96;
```

### Typography

- **Font:** Inter (optimized for reading)
- **Base size:** 14px
- **Line height:** 1.5

### Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

---

## State Management

Using React Context (`AppContext.tsx`) with these key states:

```typescript
interface AppState {
  // Job
  job: JobDescription | null;
  
  // Candidates
  candidates: ShortlistCandidate[];
  selectedCandidateId: string | null;
  
  // Copilot
  copilot: CopilotState;
  
  // UI
  currentView: 'setup' | 'shortlist' | 'detail';
}
```

---

## API Integration

The frontend connects to the backend at `VITE_API_URL` (default: `http://localhost:3005`).

### Key Endpoints Used:

| Endpoint | Purpose |
|----------|---------|
| `POST /extract-jd` | Extract job description data from PDF |
| `POST /match-multiple` | Process multiple resumes against JD |
| `POST /assess-candidate` | Get detailed assessment for one candidate |
| `POST /assess-batch` | Batch assessment for multiple candidates |

---

## Accessibility & Performance

### Keyboard Navigation
- All interactive elements focusable
- Visible focus states with `outline: 2px solid`
- Tab order follows visual layout

### Performance Targets
- Initial render: <2s perceived
- Clear loading states for AI actions
- No blocking spinners for background processing
- Skeleton loading for async content

---

## Running the Frontend

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Final UX Test (Mandatory)

A recruiter must be able to:

1. ✅ Upload resumes
2. ✅ Get a shortlist
3. ✅ Pick top 3
4. ✅ Explain each pick in plain English

**All within 15 minutes.**

---

## File Tree

```
frontend/
├── .env                     # API URL configuration
├── index.html               # HTML entry with Inter font
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── api/client.ts
    ├── components/
    │   ├── CopilotPanel.tsx
    │   └── CopilotPanel.css
    ├── context/AppContext.tsx
    ├── pages/
    │   ├── JobSetup.tsx
    │   ├── JobSetup.css
    │   ├── Shortlist.tsx
    │   ├── Shortlist.css
    │   ├── CandidateDetail.tsx
    │   └── CandidateDetail.css
    ├── types/index.ts
    ├── App.tsx
    ├── App.css
    ├── index.css
    └── main.tsx
```
