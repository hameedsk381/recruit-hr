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
        version: '1.0.0',
        description: 'Extracts structured JSON data from job description text using Groq',
        modelConfig: {
            recommendedModel: 'llama-3-8b-8192',
            temperature: 0.3,
            maxTokens: 1500
        },
        template: `You are an expert HR assistant specializing in extracting information from job descriptions.
Extract the key information from the job description and return ONLY the JSON object in the following format:
{
  "title": "Job title",
  "company": "Company name",
  "location": "Job location",
  "salary": "Salary range or compensation details",
  "requirements": ["List of job requirements"],
  "responsibilities": ["List of job responsibilities"],
  "skills": ["List of required skills"],
  "industrialExperience": ["List of required industrial experience"],
  "domainExperience": ["List of required domain experience"],
  "requiredIndustrialExperienceYears": "Required years of industrial experience as a number (e.g., if the job requires 3-5 years, use 3 as the minimum)",
  "requiredDomainExperienceYears": "Required years of domain experience as a number",
  "employmentType": "Type of employment (Full-Time, Part-Time, Contract, or Internship)",
  "department": "Department name if mentioned",
  "description": "Full job description text"
}

When extracting experience requirements, look for phrases like "years of experience", "minimum experience", "X+ years", etc. If a range is given (e.g., "3-5 years"), use the minimum value. If the requirement is vague (e.g., "experience preferred"), estimate a reasonable number or use 0 if not clearly specified.

For employment type, look for keywords like:
- Full-Time: "full time", "full-time", "permanent"
- Part-Time: "part time", "part-time"
- Contract: "contract", "contractual", "freelance"
- Internship: "intern", "internship", "trainee"

Return only the JSON object. Do not include any other text, markdown formatting, or explanations.`
    },
    'JOB_MATCHING_V1': {
        id: 'job-matching',
        version: '1.0.0',
        description: 'Analyzes match between job description and resume',
        modelConfig: {
            recommendedModel: 'llama-3-8b-8192',
            temperature: 0.3,
            maxTokens: 1024
        },
        template: `You are an expert HR consultant specializing in job-resume matching analysis.
Analyze the provided job description and resume, focusing specifically on ROLE RELEVANCE, SKILLSET MATCHING, and EXPERIENCE QUALITY.

CRITICAL EVALUATION CRITERIA:
1. Role Relevance: How well does the candidate's background align with the job role?
2. Technical Skills Match: What percentage of required technical skills does the candidate possess?
3. Experience Level Alignment: Does the candidate have appropriate experience for the role level?
4. Domain Expertise: Does the candidate have relevant industry/domain experience?
5. Recent Experience Quality: Focus on the candidate's most recent company experience and its relevance
6. Experience Threshold Compliance: Does the candidate meet the minimum required years of experience?

SCORING GUIDELINES:
- Only provide matches with score >= 60 (below 60 = irrelevant)
- Score 60-70: Basic relevance with some skill gaps
- Score 70-85: Good match with minor gaps
- Score 85-100: Excellent match, highly relevant

EXPERIENCE EVALUATION FOCUS:
- Pay special attention to the candidate's most recent work experience
- Evaluate if the required years of domain experience are met or exceeded
- If the job requires X years of experience, candidates MUST have at least X years
- Recent relevant experience should be weighted more heavily than older experience
- For domain-specific skills (e.g., Python), only count experience if it's in the relevant domain

Return a JSON response with this structure:
{
  "matchScore": <number between 0-100>,
  "relevantMatch": <boolean - true only if score >= 60>,
  "roleAlignment": {
    "score": <number 0-100>,
    "assessment": "<detailed role relevance assessment>"
  },
  "skillsetMatch": {
    "technicalSkillsMatch": <percentage 0-100>,
    "matchedSkills": ["skill1", "skill2"],
    "criticalMissingSkills": ["skill3", "skill4"],
    "skillGapSeverity": "<low/medium/high>"
  },
  "experienceAlignment": {
    "levelMatch": "<junior/mid/senior>",
    "yearsMatch": "<assessment>",
    "relevantExperience": "<assessment>",
    "domainExperienceMatch": "<evaluation of domain experience requirements>",
    "recentExperienceMatch": "<evaluation of recent company experience relevance>"
  },
  "strengths": ["specific strength1", "specific strength2"],
  "recommendations": ["specific recommendation1", "specific recommendation2"],
  "rejectionReason": "<reason if not relevant, null if relevant>"
}

BE STRICT: Only flag as relevantMatch=true if the candidate genuinely fits the role and has meaningful skill overlap. Pay special attention to experience thresholds - if a job requires X years and the candidate has less than X years, this should significantly impact the score. For domain-specific skills, only count experience if it's in the relevant domain.

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
