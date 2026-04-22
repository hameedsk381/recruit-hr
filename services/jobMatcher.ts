import { groqChatCompletion } from "../utils/groqClient";
import { JobDescriptionData } from "./jdExtractor";
import { ResumeData } from "./resumeExtractor";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { createHash, randomUUID } from "crypto";
import { logger } from "../utils/logger";
import { PIIManager } from "../utils/pii";
import { extractJsonFromResponse } from "../utils/jsonParser";
import { ToonEncoder } from "../utils/toon";

const JOB_MATCHING_PROMPT = `You are an expert HR consultant specializing in cross-industry talent matching.
Analyze the provided job description and resume, focusing on CORE COMPETENCIES, DOMAIN RELEVANCE, and EXPERIENCE QUALITY.

CRITICAL EVALUATION:
1. Core Fit: How well does the candidate's functional background align with the industry and role?
2. Skills Match: What percentage of mandatory skills (technical or functional) are present?
3. Domain Mastery: Does the candidate have relevant industry experience (e.g., Retail, Manufacturing, Tech)?
4. Seniority Alignment: Does the years of experience match the role's seniority requirements?
5. Recent Track Record: Assessment of the candidate's most recent company and impact.

SCORING:
- 0-59: Poor match / Unqualified
- 60-74: Potential match with gaps
- 75-100: Strong match

Return a JSON response:
{
  "Id": "unique_id",
  "Resume Data": {
    "Job Title": "target_role",
    "Matching Percentage": "string_0_100",
    "name": "string",
    "email": "string",
    "experience": "years",
    "skills": ["list"],
    "certifications": ["list"],
    "total_experience": ["list"]
  },
  "Analysis": {
    "Matching Score": number,
    "Unmatched Skills": ["list"],
    "Matched Skills": ["list"],
    "Strengths": ["list"],
    "Recommendations": ["list"],
    "IndustryRelevance": "assessment of candidate fit for the specific industry",
    "ExperienceThresholdCompliance": "evaluation of years of experience",
    "RecentExperienceRelevance": "assessment of recent role"
  }
}`;


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

    // 4. Format context data using TOON for token optimization
    const jobContext = {
      title: jobDescription.title,
      industry: (jobDescription as any).industry || 'General',
      requiredIndustrialExperienceYears: jobDescription.requiredIndustrialExperienceYears || 0,
      requiredDomainExperienceYears: jobDescription.requiredDomainExperienceYears || 0,
      requiredSkills: jobDescription.skills || []
    };

    const candidateContext = {
      alias: maskedResume.name,
      skills: maskedResume.skills,
      experience: Array.isArray(resume.experience) 
        ? resume.experience.map((e: any) => {
            if (typeof e === 'object' && e !== null) {
              return { 
                role: e.role || 'Unknown', 
                company: PIIManager.maskString(e.company || 'Unknown'), 
                duration: e.duration || 'Unknown' 
              };
            }
            return { raw: String(e) };
          }) 
        : [],
      candidateIndustrialExperienceYears: maskedResume.totalIndustrialExperienceYears || 0,
      candidateDomainExperienceYears: maskedResume.totalDomainExperienceYears || 0
    };

    const prompt = `
Job Requirements (TOON format):
${ToonEncoder.encode(jobContext)}

Candidate Profile (TOON format):
${ToonEncoder.encode(candidateContext)}
`;

    logger.info('Sending masked candidate data to Groq for analysis', { matchId });

    const response = await groqChatCompletion(
      "You are an expert HR consultant specializing in job-resume matching analysis. Respond in valid JSON.",
      `${JOB_MATCHING_PROMPT}\n\nContext:\n${prompt}`,
      0.3,
      1536,
      { type: "json_object" }
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