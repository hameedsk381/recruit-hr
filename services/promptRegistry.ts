/**
 * Model & Prompt Governance Layer
 * 
 * This registry centralizes all AI prompts to ensure versioning, auditability, and standardization.
 * As per Enterprise Architecture principles, we treat prompts as code artifacts that must be versioned.
 */

export interface PromptTemplate {
    id: string;
    version: string;
    description: string;
    modelConfig: {
        recommendedModel: string;
        temperature: number;
        maxTokens: number;
    };
    template: string; // The raw prompt string, potentially with {{placeholders}}
    inputSchema?: string; // Description of expected inputs
}

// In-memory registry for now (can be moved to DB)
export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
    'RESUME_EXTRACTION_V1': {
        id: 'resume-extraction',
        version: '1.0.0',
        description: 'Extracts structured JSON data from resume text using Groq',
        modelConfig: {
            recommendedModel: 'llama-3-8b-8192', // Example default
            temperature: 0.3,
            maxTokens: 1024
        },
        template: `You are an expert HR assistant specializing in extracting information from resumes.
Extract the key information from the resume and return ONLY the JSON object in the following format:
{
  "name": "Candidate name",
  "email": "Email address",
  "phone": "Phone number",
  "skills": ["List of skills"],
  "experience": [
    {
      "role": "Job title",
      "company": "Company name",
      "duration": "Employment duration in readable format (e.g., 'Jan 2022 - Jun 2022' or '2022 - 2025')",
      "responsibilities": ["List of key responsibilities and achievements"]
    }
  ],
  "education": ["List of educational qualifications"],
  "certifications": ["List of certifications"],
  "industrialExperience": ["List of industrial experience"],
  "domainExperience": ["List of domain experience"],
  "totalIndustrialExperienceYears": "Total years of industrial experience as a number (sum all work experiences, e.g., if worked at Company A for 2 years and Company B for 3 years, this should be 5)",
  "totalDomainExperienceYears": "Total years of domain experience as a number"
}

IMPORTANT INSTRUCTIONS FOR CALCULATING EXPERIENCE:
1. To calculate totalIndustrialExperienceYears:
   - Look at each work experience entry in the experience array
   - For each entry, examine the duration field to determine length of employment
   - Convert time periods to years:
     * "Jan 2022 - Jun 2022" = 0.5 years (6 months)
     * "2022 - 2025" = 3 years
     * "2020 to present" = Current year (2024) - 2020 = 4 years
     * "3 years" = 3 years
     * "18 months" = 1.5 years
   - Sum all the years of experience from each job
   - Return ONLY the final sum as a NUMBER (not a string)

2. Examples of correct calculation:
   - Experience 1: "Jan 2020 - Jun 2022" (2.5 years) + Experience 2: "2022 - 2025" (3 years) = 5.5 years
   - Experience 1: "2020-2022" (2 years) + Experience 2: "2022-2024" (2 years) = 4 years

3. Common mistakes to avoid:
   - Do NOT return the duration of a single job
   - Do NOT return a string value like "5 years" - return the number 5
   - Do NOT return null or undefined - calculate and return a number
   - Do NOT guess - if you cannot calculate, use your best estimate based on the provided dates

Return only the JSON object. Do not include any other text, markdown formatting, or explanations.`
    },
    'JD_EXTRACTION_V1': {
        id: 'jd-extraction',
        version: '1.1.0',
        description: 'Extracts structured JSON data from job description text. Industry-agnostic.',
        modelConfig: {
            recommendedModel: 'llama-3-8b-8192',
            temperature: 0.2,
            maxTokens: 1500
        },
        template: `You are an expert HR assistant specializing in multi-industry talent acquisition.
Extract key information from the job description and return ONLY the JSON object.

VALIDATION RULES:
1. If the provided text appears to be a PERSON'S RESUME (e.g., contains personal summaries, work history of one individual, education, etc.) instead of a Job Description, return: {"error": "DOCUMENT_IS_RESUME", "message": "This appears to be a candidate resume. Please upload a Job Description."}
2. Be industry-agnostic. Whether it's healthcare, manufacturing, retail, or software, extract the relevant competencies.

JSON FORMAT:
{
  "title": "Job title",
  "company": "Company name",
  "location": "Job location",
  "salary": "Salary range or compensation details",
  "requirements": ["List of job requirements"],
  "responsibilities": ["List of job responsibilities"],
  "skills": ["List of required skills/competencies"],
  "industrialExperience": ["List of required industrial experience"],
  "domainExperience": ["List of required domain experience"],
  "requiredIndustrialExperienceYears": number,
  "requiredDomainExperienceYears": number,
  "employmentType": "Full-Time | Part-Time | Contract | Internship",
  "department": "Department name",
  "description": "Full job description text"
}

Return ONLY the JSON object. Do not include markdown formatting or explanations.`
    },
    'JOB_MATCHING_V1': {
        id: 'job-matching',
        version: '1.1.0',
        description: 'Analyzes match between JD and resume. High precision, industry-agnostic.',
        modelConfig: {
            recommendedModel: 'llama-3-8b-8192',
            temperature: 0.2,
            maxTokens: 1024
        },
        template: `You are an expert HR consultant specializing in cross-industry matching.
Analyze the provided JD and resume. Focus on:
1. Core Competency Match (Technical or non-technical)
2. Years of relevant Experience
3. Domain Relevance (e.g., Pharma, Fintech, Automotive, Software)
4. Recent Role Quality

SCORING:
- 0-59: Poor fit
- 60-75: Potential fit with gaps
- 76-100: Strong match

Return ONLY a JSON object:
{
  "matchScore": <number>,
  "relevantMatch": <boolean>,
  "roleAlignment": { "score": <number>, "assessment": "<text>" },
  "skillsetMatch": {
    "technicalSkillsMatch": <number>,
    "matchedSkills": [],
    "criticalMissingSkills": [],
    "skillGapSeverity": "low | medium | high"
  },
  "experienceAlignment": {
    "levelMatch": "junior | mid | senior",
    "yearsMatch": "<text>",
    "domainExperienceMatch": "<text>"
  },
  "strengths": ["string"],
  "recommendations": ["string"],
  "rejectionReason": "<text | null>"
}

{{input_data}}`
    },
    'OFFER_ACCEPTANCE_PREDICTION_V1': {
        id: 'offer-acceptance-prediction',
        version: '1.0.0',
        description: 'Predicts the probability of a candidate accepting an offer based on profile and offer details',
        modelConfig: {
            recommendedModel: 'llama-3-70b-8192',
            temperature: 0.2,
            maxTokens: 1024
        },
        template: `You are an expert recruitment analyst specializing in offer acceptance prediction.
Analyze the candidate profile, the offer details, and the provided market context to predict the probability of acceptance.

CONSIDER THE FOLLOWING FACTORS:
1. Career Trajectory: Is this a step up, lateral, or step down for the candidate?
2. Compensation Alignment: How does the offer compare to market benchmarks and the candidate's experience?
3. Time in Process: How long has the candidate been in the pipeline? (Longer = potentially colder)
4. Interview Sentiment: Based on interview scorecards, how enthusiastic was the candidate?
5. External Supply/Demand: Is the candidate's skill set in high demand?

Return ONLY a JSON object in this format:
{
  "probability": <number between 0-1>,
  "confidence": "high" | "medium" | "low",
  "drivers": [
    {
      "factor": "Factor name",
      "impact": "positive" | "negative",
      "reasoning": "Brief explanation"
    }
  ],
  "recommendations": ["Actionable steps to increase acceptance likelihood"],
  "analysis": "A brief summary of the reasoning"
}

DATA FOR ANALYSIS:
{{input_data}}`
    }
};

export function getPrompt(id: string): PromptTemplate {
    const prompt = PROMPT_REGISTRY[id];
    if (!prompt) {
        throw new Error(`Prompt with ID ${id} not found in registry`);
    }
    return prompt;
}

/**
 * Replaces placeholders in a prompt template with actual values
 */
export function hydratePrompt(template: string, variables: Record<string, string>): string {
    let text = template;
    for (const [key, value] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return text;
}
