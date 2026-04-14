import { groqChatCompletion } from "../utils/groqClient";
import { JobDescriptionData } from "./jdExtractor";
import { ResumeData } from "./resumeExtractor";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { createHash, randomUUID } from "crypto";
import { logger } from "../utils/logger";
import { PIIManager } from "../utils/pii";

const JOB_MATCHING_PROMPT = `You are an expert HR consultant specializing in job-resume matching analysis.
Analyze the provided job description and resume, focusing specifically on ROLE RELEVANCE, SKILLSET MATCHING, and EXPERIENCE QUALITY.

CRITICAL EVALUATION CRITERIA:
1. Role Relevance: How well does the candidate's background align with the job role?
2. Technical Skills Match: What percentage of required technical skills does the candidate possess?
3. Experience Level Alignment: Does the candidate have appropriate experience for the role level?
4. Domain Expertise: Does the candidate have relevant industry/domain experience?
5. Recent Experience Quality: Focus on the candidate's most recent company experience and its relevance
6. Experience Threshold Compliance: Does the candidate meet the minimum required years of experience?

SCORING GUIDELINES:
- Score 0-100 with the following breakdown:
- Score 85-100: Excellent match, highly relevant
- Score 70-84: Good match with minor gaps
- Score 60-69: Basic relevance with some skill gaps
- Score 0-59: Poor match or doesn't meet minimum requirements

EXPERIENCE EVALUATION FOCUS:
- Pay special attention to the candidate's most recent work experience
- Evaluate if the required years of domain experience are met or exceeded
- If the job requires X years of experience, candidates MUST have at least X years
- Recent relevant experience should be weighted more heavily than older experience
- For domain-specific skills (e.g., Python), only count experience if it's in the relevant domain

Return a JSON response with this structure:
{
  "Id": "Unique identifier for this match analysis",
  "Resume Data": {
    "Job Title": "Job title from the job description",
    "Matching Percentage": "Overall matching percentage as a string (e.g., '85')",
    "college_name": null,
    "company_names": [],
    "degree": null,
    "designation": null,
    "email": "Candidate email",
    "experience": "Years of experience or experience details",
    "mobile_number": "Candidate phone number",
    "name": "Candidate name",
    "no_of_pages": null,
    "skills": ["List of candidate skills"],
    "certifications": ["List of candidate certifications"],
    "total_experience": ["List of work experiences"]
  },
  "Analysis": {
    "Matching Score": "Overall matching score as a number (e.g., 85)",
    "Unmatched Skills": ["List of skills required but not found in resume"],
    "Matched Skills": ["List of skills that match between job and resume"],
    "Strengths": ["List of candidate strengths relevant to the job"],
    "Recommendations": ["List of recommendations for improving match"],
    "Required Industrial Experience": "Required industrial experience description",
    "Required Domain Experience": "Required domain experience description",
    "Candidate Industrial Experience": "Candidate industrial experience description",
    "Candidate Domain Experience": "Candidate domain experience description",
    "Experience Threshold Compliance": "Evaluation of whether candidate meets minimum experience requirements",
    "Recent Experience Relevance": "Assessment of recent work experience quality and relevance"
  }
}

Provide a detailed analysis with specific examples from the resume that match or don't match the job requirements.`;

// Function to extract JSON from AI response
function extractJsonFromResponse(response: string): any {
  try {
    return JSON.parse(response);
  } catch (e) {
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) cleanResponse = cleanResponse.substring(7);
    if (cleanResponse.startsWith("```")) cleanResponse = cleanResponse.substring(3);
    if (cleanResponse.endsWith("```")) cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
    cleanResponse = cleanResponse.trim();
    const jsonStart = cleanResponse.indexOf("{");
    if (jsonStart !== -1) {
      const jsonEnd = cleanResponse.lastIndexOf("}") + 1;
      if (jsonEnd > jsonStart) {
        return JSON.parse(cleanResponse.substring(jsonStart, jsonEnd));
      }
    }
    throw e;
  }
}

export interface MatchResult {
  Id: string;
  "Resume Data": {
    "Job Title": string;
    "Matching Percentage": string;
    college_name: null;
    company_names: any[];
    degree: null;
    designation: null;
    email: string;
    experience: number | any[];
    mobile_number: string;
    name: string;
    no_of_pages: null;
    skills: string[];
    certifications: string[];
    total_experience: any[];
  };
  Analysis: {
    "Matching Score": number;
    "Unmatched Skills": string[];
    "Matched Skills": string[];
    "Matched Skills Percentage"?: number;
    "Unmatched Skills Percentage"?: number;
    Strengths: string[];
    Recommendations: string[];
    "Required Industrial Experience": string;
    "Required Domain Experience": string;
    "Candidate Industrial Experience": string;
    "Candidate Domain Experience": string;
    "Experience Threshold Compliance"?: string;
    "Recent Experience Relevance"?: string;
  };
  matchScore?: number;
  unmatchedSkills?: string[];
  matchedSkills?: string[];
  strengths?: string[];
  recommendations?: string[];
  requiredIndustrialExperienceYears?: number;
  requiredDomainExperienceYears?: number;
  candidateIndustrialExperienceYears?: number;
  candidateDomainExperienceYears?: number;
  industrialExperienceDetails?: string;
  domainExperienceDetails?: string;
  matchedSkillsPercentage?: number;
  unmatchedSkillsPercentage?: number;
  summary?: string;
}

export async function matchJobWithResume(
  jobDescription: JobDescriptionData,
  resume: ResumeData
): Promise<MatchResult> {
  const startTime = Date.now();
  const matchId = randomUUID();

  try {
    // 1. Create a cache key 
    const cacheKey = `job_match_${createHash('md5')
      .update(JSON.stringify({ job: jobDescription, resume: resume }))
      .digest('hex')}`;

    // 2. Try to get result from cache 
    const cachedResult = await getLLMCache(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached job match result', { matchId, cacheKey });
      return cachedResult as MatchResult;
    }

    // 3. PII MASKING for AI privacy
    const maskedResume = PIIManager.maskCandidateProfile(resume);

    // 4. Format experience
    let formattedExperience = 'Not specified';
    if (Array.isArray(resume.experience) && resume.experience.length > 0) {
      formattedExperience = resume.experience.map((exp: any, index) => {
        const role = exp.role || 'Not specified';
        const company = PIIManager.maskString(exp.company || 'Not specified'); // Mask company names potentially
        const duration = exp.duration || 'Not specified';
        return `${index + 1}. ${role} at ${company} (${duration})`;
      }).join('\n');
    }

    const prompt = `
Job Title: ${jobDescription.title}
Required Industrial Experience Years: ${jobDescription.requiredIndustrialExperienceYears || 0}
Required Domain Experience Years: ${jobDescription.requiredDomainExperienceYears || 0}

Candidate Alias: ${maskedResume.name}
Candidate Skills: ${maskedResume.skills.join('\n')}
Candidate Experience:
${formattedExperience}

Candidate Industrial Experience Years: ${maskedResume.totalIndustrialExperienceYears || 0}
Candidate Domain Experience Years: ${maskedResume.totalDomainExperienceYears || 0}
`;

    logger.info('Sending masked candidate data to Groq for analysis', { matchId });

    const response = await groqChatCompletion(
      "You are an expert HR consultant specializing in job-resume matching analysis.",
      `${JOB_MATCHING_PROMPT}\n\nContext:\n${prompt}`,
      0.3,
      1536
    );

    const duration = Date.now() - startTime;
    logger.info('Received analysis from AI provider', { matchId, durationMs: duration });

    let matchResult: any = extractJsonFromResponse(response);

    // Provide safe defaults if the LLM hallucinated keys
    if (!matchResult) matchResult = {};
    if (!matchResult["Resume Data"]) matchResult["Resume Data"] = {};
    if (!matchResult.Analysis) matchResult.Analysis = {};

    // UNMASK if necessary (Restore name/email from original resume)
    matchResult["Resume Data"].name = resume.name;
    matchResult["Resume Data"].email = resume.email;
    matchResult["Resume Data"].mobile_number = resume.phone;

    // Mapping additional properties for backend compatibility
    matchResult.matchScore = matchResult.Analysis["Matching Score"] || 0;
    matchResult.summary = `Evaluated candidate background against ${jobDescription.title}.`;

    // Cache the result
    await setLLMCache(cacheKey, matchResult, 1000 * 60 * 60 * 24);

    return matchResult;

  } catch (error) {
    logger.error('Critical failure in Job Matching service', error as Error, { matchId });
    throw error;
  }
}