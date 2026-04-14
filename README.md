# reckuit.ai

AI-powered HR tools for resume parsing, job description analysis, and candidate matching.

## Features

- **Resume Extraction**: Extract structured data from resume PDFs
- **Job Description Extraction**: Extract structured data from job description PDFs
- **JD Validation**: Validate job descriptions for matching suitability
- **MCQ Generation**: Generate multiple-choice questions based on job descriptions and resumes
- **Job Matching**: Match job descriptions with one or more resumes to determine compatibility
- **Answer Evaluation**: Evaluate text answers for career-related questions

## Installation

1. Navigate to the hr-tools directory:
   ```bash
   cd hr-tools
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the .env.example file to .env and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

## Configuration

Create a `.env` file with the following variables:

```
GROQ_API_KEY=your_groq_api_key_here
# Or for multiple API keys:
# GROQ_API_KEYS=your_groq_api_key_1,your_groq_api_key_2,your_groq_api_key_3
OLLAMA_BASE_URL=http://localhost:11434
HR_TOOLS_PORT=3001
```

## Running the Server

### Using Bun (Native)

To start the HR tools server:

```bash
bun run start
```

Or for development with auto-reload:

```bash
bun run dev
```

### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t docapture-hr-tools .
   ```

2. Run the container:
   ```bash
   docker run -p 3001:3001 --env-file .env docapture-hr-tools
   ```

### Using Docker Compose

1. Build and run with docker-compose:
   ```bash
   docker-compose up --build
   ```

The server will be available at `http://localhost:3001`

### Local Development with Docker (Redis + MongoDB)

For local development, you can run Redis and MongoDB using Docker:

```bash
# Start Redis and MongoDB containers
docker-compose up -d

# Verify containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

**Services Started:**

| Service | Port | Description |
|---------|------|-------------|
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache |
| Mongo Express | 8082 | MongoDB UI (optional) |
| Redis Commander | 8081 | Redis UI (optional) |

**Connection URLs (Local Docker):**
```
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://skillmatrix_user:skillmatrix_pass@localhost:27017/skillmatrix
```

**Stopping containers:**
```bash
docker-compose down          # Stop containers
docker-compose down -v       # Stop and remove volumes (clears data)
```

## API Endpoints

### Resume Extraction
```
POST /extract-resume
```
Extract structured data from a resume PDF.

**Request:**
- Form data with a `resume` field containing the PDF file

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["JavaScript", "TypeScript", "React"],
    "experience": ["Software Engineer at Company A", "Developer at Company B"],
    "education": ["B.S. Computer Science"],
    "certifications": ["AWS Certified Developer"]
  }
}
```

### Job Description Extraction
```
POST /extract-jd
```
Extract structured data from a job description PDF.

**Request:**
- Form data with a `jobDescription` field containing the PDF file

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Senior Software Engineer",
    "company": "Tech Corp",
    "location": "San Francisco, CA",
    "salary": "$120,000 - $150,000",
    "requirements": ["5+ years experience", "BS in Computer Science"],
    "responsibilities": ["Develop web applications", "Collaborate with team"],
    "skills": ["JavaScript", "React", "Node.js"]
  }
}
```

### JD Validation
```
POST /validate-jd
```
Validate a job description for matching suitability and identify missing information.

**Request:**
- Form data with a `job_description` field containing the PDF file
- OR JSON body with `job_description_url` field containing a URL to the PDF file

**Response:**
```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": true,
      "isComplete": true,
      "errors": [],
      "warnings": [],
      "missingCriticalFields": [],
      "missingRecommendedFields": [],
      "documentType": "job_description",
      "suitabilityScore": 95
    },
    "extractedData": {
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "skillsCount": 6,
      "requirementsCount": 3
    },
    "detailedReport": "Job Description Validation Report\n================================\n\nDocument Type: job_description\nValidity: VALID\nCompleteness: COMPLETE\nSuitability Score: 95/100\n\nCritical Missing Information:\n  Title: Present\n  Company: Present\n  Skills: Present (6 skills listed)\n  Requirements: Present (3 requirements listed)\n\nRecommended Information:\n  Location: Present\n  Salary: Present\n  Responsibilities: Present\n  Industrial Experience: Present\n  Domain Experience: Present\n  Industrial Experience Years: Present\n  Domain Experience Years: Present\n  Employment Type: Present\n  Department: Present\n\nMatching Suitability: 95%\nAssessment: Excellent for matching\n"
  }
}
```

### MCQ Generation
```
POST /generate-mcq
```
Generate multiple-choice questions based on a job description and resume.

**Request:**
- Form data with `jobDescription` and `resume` fields containing the PDF files

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question": "What is the correct way to declare a variable in JavaScript?",
        "options": ["var myVar;", "variable myVar;", "v myVar;", "declare myVar;"],
        "correctAnswer": "var myVar;",
        "explanation": "In JavaScript, variables are declared using the 'var', 'let', or 'const' keywords."
      }
    ]
  }
}
```

### Job Matching
```
POST /match
```
Match a job description with one or more resumes to determine compatibility.

**Request:**
- Form data with:
  - `jobDescription` field containing the job description PDF file
  - Either:
    - `resume` field for a single resume (backward compatibility)
    - `resumes` field for multiple resumes (can be used multiple times)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "Id": "uuid-1",
      "Resume Data": {
        "Job Title": "Senior Software Engineer",
        "Matching Percentage": "85",
        "name": "John Doe",
        "email": "john@example.com",
        "skills": ["JavaScript", "React", "Node.js"]
      },
      "Analysis": {
        "Matching Score": 85,
        "Matched Skills": ["JavaScript", "React"],
        "Unmatched Skills": ["Python", "AWS"],
        "Strengths": ["5 years of relevant experience"],
        "Recommendations": ["Gain experience with Python", "Get AWS certification"]
      }
    },
    {
      "Id": "uuid-2",
      "Resume Data": {
        "Job Title": "Senior Software Engineer",
        "Matching Percentage": "72",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "skills": ["Python", "Django", "PostgreSQL"]
      },
      "Analysis": {
        "Matching Score": 72,
        "Matched Skills": ["Python"],
        "Unmatched Skills": ["JavaScript", "React", "Node.js"],
        "Strengths": ["3 years of backend development experience"],
        "Recommendations": ["Learn JavaScript and React", "Gain frontend experience"]
      }
    }
  ],
  "errors": [] // Present only if there were errors processing any resumes
}
```

### Answer Evaluation
```
POST /evaluate
```
Evaluate a text answer for career-related questions.

**Request:**
- JSON body with `question` and `answer` fields:
```json
{
  "question": "Tell me about a time when you faced a challenging problem at work and how you solved it.",
  "answer": "In my previous role, I encountered a situation where our team was falling behind on a critical project deadline due to unclear requirements..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Authentic": 8,
    "Clarity": 9,
    "Fluency": 7,
    "Focused": 8,
    "NoFillers": 9,
    "Professionalism": 8,
    "Relevance": 9,
    "StructuredAnswers": 8,
    "total_average": 8.22,
    "UniqueQualities": 7,
    "total_overall_score": 74
  }
}
```

### Multiple Job Matching (⚡ NEW & IMPROVED)
```
POST /match-multiple
```
Match multiple job descriptions with multiple resumes with **parallel processing**, intelligent caching, and relevance filtering.

**🚀 Recent Improvements:**
- ⚡ **3x faster** with parallel processing (3 concurrent operations)
- 📊 **Structured logging** with request ID tracking
- 🛡️ **Comprehensive validation** (file size, type, batch limits)
- 📈 **Progress tracking** for long operations
- 💪 **Enhanced error handling** with partial results
- 🔍 **Request ID** in all responses for debugging

**Features:**
- Supports multiple JD files and multiple resume files
- **Intelligent Relevance Filtering**: Only returns matches with score ≥ 60
- **Role & Skillset Focus**: Prioritizes role alignment and technical skill matching
- Automatic caching of extracted data (24-hour TTL)
- Reuses previously extracted JDs and resumes if uploaded again
- Smart matching result caching (12-hour TTL)
- Reasonable limits to prevent system overload

**Matching Criteria:**
- **Minimum Score**: 60/100 (below 60 = irrelevant, filtered out)
- **Role Relevance**: Candidate background alignment with job role
- **Technical Skills**: Percentage match of required technical skills
- **Experience Level**: Appropriate experience for role level
- **Domain Expertise**: Relevant industry/domain experience

**Request:**
- Form data with:
  - `job_descriptions` field for multiple JD PDF files (can be used multiple times)
  - `resumes` field for multiple resume PDF files (can be used multiple times)

**Limits:**
- Maximum 10 JD files
- Maximum 10 resume files  
- Maximum 50 total combinations (JDs × resumes)

**Response:**
```json
{
  "POST Response": [
    {
      "Id": "ca1c6189-15bc-46d9-adee-5f756c344b79",
      "Resume Data": {
        "Job Title": "Senior Software Engineer",
        "Matching Percentage": "92",
        "college_name": null,
        "company_names": [],
        "degree": null,
        "designation": null,
        "email": "john@example.com",
        "experience": 5,
        "mobile_number": "+1-234-567-8900",
        "name": "John Doe",
        "no_of_pages": null,
        "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
        "certifications": ["AWS Certified Developer"],
        "total_experience": [
          {
            "role": "Senior Developer",
            "company": "Tech Corp",
            "duration": "2020 - Present",
            "responsibilities": ["Led development team", "Built microservices"]
          }
        ]
      },
      "Analysis": {
        "Matching Score": 92,
        "Unmatched Skills": ["Python"],
        "Matched Skills": ["JavaScript", "React", "Node.js"],
        "Matched Skills Percentage": 85,
        "Unmatched Skills Percentage": 15,
        "Strengths": ["5+ years experience", "Strong technical skills"],
        "Recommendations": ["Learn Python", "Get AWS certification"],
        "Required Industrial Experience": "3 years",
        "Required Domain Experience": "0 years",
        "Candidate Industrial Experience": "5 years",
        "Candidate Domain Experience": "5 years"
      }
    },
    {
      "Id": "9f210aa8-0442-452c-8c63-4fd4d7e11fa9",
      "Resume Data": {
        "Job Title": "Senior Software Engineer",
        "Matching Percentage": "72",
        "college_name": null,
        "company_names": [],
        "degree": null,
        "designation": null,
        "email": "jane@example.com",
        "experience": 3,
        "mobile_number": "+1-234-567-8901",
        "name": "Jane Smith",
        "no_of_pages": null,
        "skills": ["Python", "Django", "PostgreSQL"],
        "certifications": [],
        "total_experience": [
          {
            "role": "Backend Developer",
            "company": "Startup Inc",
            "duration": "2021 - Present",
            "responsibilities": ["Built REST APIs", "Database design"]
          }
        ]
      },
      "Analysis": {
        "Matching Score": 72,
        "Unmatched Skills": ["JavaScript", "React", "Node.js"],
        "Matched Skills": ["Python"],
        "Matched Skills Percentage": 60,
        "Unmatched Skills Percentage": 40,
        "Strengths": ["3 years backend experience"],
        "Recommendations": ["Learn JavaScript and React", "Gain frontend experience"],
        "Required Industrial Experience": "3 years",
        "Required Domain Experience": "0 years",
        "Candidate Industrial Experience": "3 years",
        "Candidate Domain Experience": "3 years"
      }
    }
  ]
}
```

**Key Benefits:**
- **3x Faster Performance**: Parallel processing with controlled concurrency
- **Quality over Quantity**: Only returns genuinely relevant matches
- **Request Tracking**: Unique requestId for debugging and monitoring
- **Structured Logging**: JSON logs with request correlation
- **Progress Tracking**: Real-time progress updates in server logs
- **Reduced Noise**: Filters out irrelevant combinations automatically
- **Role-Focused**: Prioritizes role alignment over generic matching
- **Skill-Centric**: Emphasizes technical skill compatibility
- **Actionable Insights**: Provides specific recommendations for skill gaps
- **Enhanced Validation**: File type, size, and batch limit checks

**Configuration (Environment Variables):**
```env
# Batch Limits
MAX_JD_FILES=10
MAX_RESUME_FILES=10
MAX_COMBINATIONS=50

# Processing
MATCH_CONCURRENCY=3  # Number of parallel operations

# Matching
MINIMUM_MATCH_SCORE=60

# Logging
LOG_LEVEL=info  # debug, info, warn, error
ENABLE_PROGRESS_LOGGING=true
```

**📚 For detailed documentation, see:**
- `IMPROVEMENTS_SUMMARY.md` - Quick overview of improvements
- `MULTIPLE_JOB_MATCH_IMPROVEMENTS.md` - Complete feature documentation
- `testMultipleJobMatchImproved.js` - Test examples

**Key Benefits:****
- **Quality over Quantity**: Only returns genuinely relevant matches
- **Reduced Noise**: Filters out irrelevant combinations automatically
- **Role-Focused**: Prioritizes role alignment over generic matching
- **Skill-Centric**: Emphasizes technical skill compatibility
- **Actionable Insights**: Provides specific recommendations for skill gaps

**Filtering Examples:**
- ✅ **Included**: Frontend Developer JD + Frontend Developer Resume (Score: 85)
- ❌ **Filtered**: Data Scientist JD + Marketing Manager Resume (Score: 25)
- ✅ **Included**: Senior Developer JD + Mid-level Developer Resume (Score: 72)
- ❌ **Filtered**: Technical Writer JD + Software Engineer Resume (Score: 45)

---

## 🤖 AI Recruiter Copilot (NEW)

The AI Recruiter Copilot transforms the system from an autonomous scoring engine into a **recruiter decision-support system**. It prioritizes clarity, evidence, and explanation over opaque scores.

### Philosophy

- **Clarity over cleverness** - Plain language explanations
- **Evidence over claims** - Every conclusion traced to data
- **Explanation over scoring** - No hidden reasoning
- **Defensible decisions** - Support recruiter accountability

### Single Candidate Assessment
```
POST /assess-candidate
```

Generate an evidence-based assessment for a single candidate against a job description.

**Structured Input (Preferred):**
```json
{
  "job_description": {
    "title": "Senior Backend Engineer",
    "company": "TechCorp",
    "core_skills": [
      { "skill": "Python", "weight": "critical", "mandatory": true },
      { "skill": "PostgreSQL", "weight": "important", "mandatory": true },
      { "skill": "Docker", "weight": "nice_to_have", "mandatory": false }
    ],
    "experience_expectations": {
      "min_years": 5,
      "domain_specific": "Backend development in fintech"
    },
    "role_context": "Building high-throughput payment processing systems"
  },
  "candidate_profile": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "extracted_skills": ["Python", "Django", "PostgreSQL", "Redis"],
    "skill_evidence": [
      {
        "skill": "Python",
        "evidence_type": "production",
        "context": "Led development of payment gateway",
        "project": "PaymentHub",
        "outcome": "Processed $10M daily transactions"
      },
      {
        "skill": "PostgreSQL",
        "evidence_type": "demonstrated",
        "context": "Designed database schemas for financial data"
      }
    ],
    "experience_estimate": {
      "total_years": 6,
      "relevant_years": 4
    },
    "recent_role": {
      "title": "Backend Engineer",
      "company": "FinTech Startup",
      "duration": "2020-Present"
    },
    "certifications": ["AWS Solutions Architect"],
    "gaps": []
  },
  "matching_signals": {
    "experience_alignment": "meets",
    "role_relevance": "high",
    "mandatory_skills_met": true
  }
}
```

**Legacy Input (PDF Upload):**
- Form data with `jd` and `resume` PDF files
- OR JSON with `jdUrl` and `resumeUrl` URLs

**Response:**
```json
{
  "success": true,
  "assessment": {
    "one_line_summary": "Experienced backend engineer with production fintech experience, meets core requirements but lacks Docker expertise.",
    "fit_assessment": {
      "overall_fit": "high",
      "reasoning": "Candidate has 6 years of total experience with 4 years in relevant backend roles. Production experience with Python and PostgreSQL in fintech domain directly aligns with role requirements. Missing Docker experience is noted but classified as nice-to-have."
    },
    "strengths": [
      {
        "skill": "Python",
        "evidence_level": "production",
        "evidence": "Led development of PaymentHub payment gateway processing $10M daily transactions"
      },
      {
        "skill": "PostgreSQL",
        "evidence_level": "demonstrated",
        "evidence": "Designed database schemas for financial data at FinTech Startup"
      }
    ],
    "gaps_and_risks": [
      {
        "area": "Docker",
        "risk_level": "low",
        "explanation": "Skill not found in profile. Classified as nice-to-have, not blocking."
      }
    ],
    "skill_match_breakdown": [
      {
        "required_skill": "Python",
        "candidate_coverage": "strong",
        "notes": "Production-level experience with measurable outcomes in payment processing"
      },
      {
        "required_skill": "PostgreSQL",
        "candidate_coverage": "strong",
        "notes": "Demonstrated experience designing financial database schemas"
      },
      {
        "required_skill": "Docker",
        "candidate_coverage": "none",
        "notes": "Skill not listed in profile or evidence"
      }
    ],
    "interview_focus_areas": [
      {
        "topic": "System Design at Scale",
        "why": "Role involves high-throughput systems; verify depth of scaling experience",
        "sample_probe_question": "Walk me through how you designed the PaymentHub system to handle $10M in daily transactions. What were the bottlenecks and how did you address them?"
      },
      {
        "topic": "Docker/Containerization",
        "why": "Gap in profile despite being listed as nice-to-have",
        "sample_probe_question": "Have you worked with containerization in any capacity? How do you typically deploy your applications?"
      }
    ],
    "recruiter_notes": {
      "override_suggestions": "If Docker expertise is critical for the team, consider whether this gap is trainable within onboarding period. Candidate's fintech production experience may outweigh this gap.",
      "confidence_level": "high"
    }
  }
}
```

### Batch Candidate Assessment
```
POST /assess-batch
```

Assess multiple candidates against a single job description in parallel.

**Request:**
```json
{
  "job_description": {
    "title": "Senior Backend Engineer",
    "core_skills": [
      { "skill": "Python", "weight": "critical", "mandatory": true }
    ],
    "experience_expectations": { "min_years": 5 }
  },
  "candidates": [
    {
      "candidate_profile": {
        "name": "Jane Smith",
        "extracted_skills": ["Python", "Django"],
        "skill_evidence": [],
        "experience_estimate": { "total_years": 6 }
      },
      "matching_signals": {
        "experience_alignment": "meets",
        "role_relevance": "high",
        "mandatory_skills_met": true
      }
    },
    {
      "candidate_profile": {
        "name": "John Doe",
        "extracted_skills": ["JavaScript", "React"],
        "skill_evidence": [],
        "experience_estimate": { "total_years": 4 }
      },
      "matching_signals": {
        "experience_alignment": "below",
        "role_relevance": "low",
        "mandatory_skills_met": false,
        "missing_mandatory_skills": ["Python"]
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "job_title": "Senior Backend Engineer",
  "total_candidates": 2,
  "assessments": [
    {
      "candidate_name": "Jane Smith",
      "assessment": {
        "one_line_summary": "...",
        "fit_assessment": { "overall_fit": "high", "reasoning": "..." }
      }
    },
    {
      "candidate_name": "John Doe",
      "assessment": {
        "one_line_summary": "...",
        "fit_assessment": { "overall_fit": "low", "reasoning": "..." }
      }
    }
  ]
}
```

### Evidence Levels

| Level | Meaning |
|-------|---------|
| `production` | Skill used in live/production systems with measurable outcomes |
| `demonstrated` | Skill used in projects, interviews, or assessments with context |
| `claimed` | Skill listed in resume/profile without supporting evidence |

### Fit Levels

| Level | Meaning |
|-------|---------|
| `high` | Strong alignment with role requirements; minimal gaps |
| `medium` | Partial alignment; some gaps but trainable or non-blocking |
| `low` | Significant gaps in mandatory requirements; high risk |

### Decision Rules

1. Skills with no context are marked `claimed`
2. Unclear experience duration is stated explicitly
3. Missing mandatory skills always appear in `gaps_and_risks`
4. Confidence is never inflated

### Error Response

When evidence is insufficient:
```json
{
  "success": false,
  "error": "Insufficient structured evidence to support a defensible hiring decision."
}
```

---

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **AI Models**: Groq (Llama 3), Ollama
- **PDF Processing**: pdf-parse, pdfjs-dist
- **Caching**: Redis
- **Database**: MongoDB

## License

MIT