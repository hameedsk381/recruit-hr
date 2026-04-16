import { groqChatCompletion } from "../utils/groqClient";
import { JobDescriptionData, extractJobDescriptionData } from "./jdExtractor";
import { ResumeData, extractResumeData } from "./resumeExtractor";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { createHash } from "crypto";
import { createLogger } from "../utils/logger";
import { processMatrix, processBatch } from "../utils/batchProcessor";
import { getPrompt, hydratePrompt } from "./promptRegistry";

export interface MultipleMatchInput {
  jdFiles: File[];
  resumeFiles: File[];
  jdUrls?: string[];  // Optional: URLs for JD files
  resumeUrls?: string[];  // Optional: URLs for resume files
  jdDataList?: JobDescriptionData[]; // Optional: Pre-extracted JD data
  tenantId?: string; // Optional: To support tenant isolated context and settings
}

export interface MultipleMatchResult {
  jdIndex: number;
  resumeIndex: number;
  jdTitle: string;
  candidateName: string;
  matchScore: number;
  matchedSkills: string[];
  unmatchedSkills: string[];
  strengths: string[];
  recommendations: string[];
  jdUrl?: string;  // URL of the JD file (if provided)
  resumeUrl?: string;  // URL of the resume file (if provided)
  jdFileName: string;  // Filename of the JD
  resumeFileName: string;  // Filename of the resume
  summary: string; // Summary explaining the matching criteria evaluation
  analysis: {
    relevantMatch: boolean;
    roleAlignment?: {
      score: number;
      assessment: string;
    };
    skillsetMatch?: {
      technicalSkillsMatch: number;
      matchedSkills: string[];
      criticalMissingSkills: string[];
      skillGapSeverity: string;
    };
    experienceAlignment?: {
      levelMatch: string;
      yearsMatch: string;
      relevantExperience: string;
      domainExperienceMatch: string;
      recentExperienceMatch: string;
    };
    rejectionReason?: string;
    // Additional fields for output formatting
    candidateEmail?: string;
    candidatePhone?: string;
    candidateCertifications?: string[];
    candidateExperience?: any[];
    candidateIndustrialExperienceYears?: number;
    candidateDomainExperienceYears?: number;
    requiredIndustrialExperienceYears?: number;
    requiredDomainExperienceYears?: number;
    [key: string]: any;
  };
}

export interface CachedExtraction {
  data: JobDescriptionData | ResumeData;
  fileName: string;
  extractedAt: number;
}

// Cache for extracted JDs and resumes to avoid re-extraction
const EXTRACTION_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function getCachedExtraction(fileBuffer: Buffer, fileName: string, type: 'jd' | 'resume'): Promise<JobDescriptionData | ResumeData | null> {
  try {
    // Create a hash of the file content for cache key
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');
    const cacheKey = `${type}_extract_${fileHash}_${fileName}`;

    const cached = await getLLMCache(cacheKey);
    if (cached) {
      console.log(`[MultipleJobMatcher] Using cached ${type} extraction for ${fileName}`);
      return cached as JobDescriptionData | ResumeData;
    }

    return null;
  } catch (error) {
    console.error(`[MultipleJobMatcher] Error getting cached extraction:`, error);
    return null;
  }
}

async function setCachedExtraction(fileBuffer: Buffer, fileName: string, type: 'jd' | 'resume', data: JobDescriptionData | ResumeData): Promise<void> {
  try {
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');
    const cacheKey = `${type}_extract_${fileHash}_${fileName}`;

    await setLLMCache(cacheKey, data, EXTRACTION_CACHE_TTL);
    console.log(`[MultipleJobMatcher] Cached ${type} extraction for ${fileName}`);
  } catch (error) {
    console.error(`[MultipleJobMatcher] Error caching extraction:`, error);
  }
}

async function extractWithCache(fileBuffer: Buffer, fileName: string, type: 'jd' | 'resume', tenantId?: string): Promise<JobDescriptionData | ResumeData> {
  try {
    console.log(`[extractWithCache] Starting extraction for ${type}: ${fileName}`);

    // Try to get from cache first
    const cached = await getCachedExtraction(fileBuffer, fileName, type);
    if (cached) {
      console.log(`[extractWithCache] Using cached data for ${fileName}`);
      return cached;
    }

    console.log(`[extractWithCache] No cache found, extracting fresh for ${fileName}`);

    // Extract data
    let extractedData: JobDescriptionData | ResumeData;
    if (type === 'jd') {
      extractedData = await extractJobDescriptionData(fileBuffer);
    } else {
      extractedData = await extractResumeData(fileBuffer, tenantId);
    }

    console.log(`[extractWithCache] Extraction complete for ${fileName}`);
    console.log(`[extractWithCache] Data preview:`, {
      type,
      fileName,
      hasName: type === 'resume' ? !!(extractedData as ResumeData).name : undefined,
      hasTitle: type === 'jd' ? !!(extractedData as JobDescriptionData).title : undefined,
      hasEmail: type === 'resume' ? !!(extractedData as ResumeData).email : undefined
    });

    // Cache the extracted data
    await setCachedExtraction(fileBuffer, fileName, type, extractedData);

    return extractedData;
  } catch (error) {
    console.error(`[extractWithCache] ERROR extracting ${type} from ${fileName}:`, error);
    throw error; // Re-throw to propagate the error
  }
}

async function performSingleMatch(jdData: JobDescriptionData, resumeData: ResumeData): Promise<any> {
  try {
    // Create cache key for this specific match
    const jdHash = createHash('md5').update(JSON.stringify(jdData)).digest('hex');
    const resumeHash = createHash('md5').update(JSON.stringify(resumeData)).digest('hex');
    const cacheKey = `match_${jdHash}_${resumeHash}`;

    // Try to get cached match result
    const cached = await getLLMCache(cacheKey);
    if (cached) {
      console.log('[MultipleJobMatcher] Using cached match result');
      return cached;
    }

    // Format the experience data for better analysis
    let formattedExperience = 'Not specified';
    if (Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
      if (typeof resumeData.experience[0] === 'object' && resumeData.experience[0] !== null) {
        // Format structured experience data
        formattedExperience = resumeData.experience.map((exp: any, index) => {
          const role = exp.role || 'Not specified';
          const company = exp.company || 'Not specified';
          const duration = exp.duration || 'Not specified';
          return `${index + 1}. ${role} at ${company} (${duration})`;
        }).join('\n');
      } else {
        // Format string array experience
        formattedExperience = resumeData.experience.join('\n');
      }
    }

    const promptData = `
Job Description:
Title: ${jdData.title}
Company: ${jdData.company}
Required Skills: ${jdData.skills?.join(', ') || 'Not specified'}
Requirements: ${jdData.requirements?.join(', ') || 'Not specified'}
Industrial Experience Required: ${jdData.requiredIndustrialExperienceYears || 0} years
Domain Experience Required: ${jdData.requiredDomainExperienceYears || 0} years
Industrial Experience Details: ${jdData.industrialExperience?.join(', ') || 'Not specified'}
Domain Experience Details: ${jdData.domainExperience?.join(', ') || 'Not specified'}
Location: ${jdData.location || 'Not specified'}

Resume:
Name: ${resumeData.name}
Current Skills: ${resumeData.skills?.join(', ') || 'Not specified'}
Work Experience: 
${formattedExperience}
Education: ${resumeData.education?.join(', ') || 'Not specified'}
Total Industrial Experience: ${resumeData.totalIndustrialExperienceYears || 0} years
Total Domain Experience: ${resumeData.totalDomainExperienceYears || 0} years
Certifications: ${resumeData.certifications?.join(', ') || 'Not specified'}

CRITICAL ANALYSIS POINTS:
1. Does this candidate's background align with the job role and requirements?
2. What percentage of required technical skills does the candidate possess?
3. Is the experience level appropriate for this role?
4. Does the candidate meet the minimum required years of industrial experience (${jdData.requiredIndustrialExperienceYears || 0} years)?
5. Does the candidate meet the minimum required years of domain experience (${jdData.requiredDomainExperienceYears || 0} years)?
6. How relevant and recent is the candidate's most recent work experience?
7. Are there any deal-breaker skill gaps?

BE STRICT IN YOUR EVALUATION:
- If the candidate has less than the required years of experience, this should significantly impact the score
- Focus on the quality and relevance of recent experience
- For domain-specific skills (e.g., Python), only count experience if it's in the relevant domain
- If a job requires X years of domain experience, candidates MUST meet or exceed that threshold
`;

    // Get prompt config
    const promptConfig = getPrompt('JOB_MATCHING_V1');
    const finalPrompt = hydratePrompt(promptConfig.template, {
      input_data: promptData
    });

    const response = await groqChatCompletion(
      "You are an expert HR consultant specializing in job-resume matching analysis.",
      finalPrompt,
      promptConfig.modelConfig.temperature,
      promptConfig.modelConfig.maxTokens
    );

    // Parse the response
    let result;
    try {
      // Clean up the response
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }

      // Find JSON object
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;

      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }

      result = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[MultipleJobMatcher] Failed to parse AI response:', response);
      // Fallback result - mark as irrelevant to be filtered out
      result = {
        matchScore: 0,
        relevantMatch: false,
        roleAlignment: { score: 0, assessment: "Unable to analyze due to parsing error" },
        skillsetMatch: {
          technicalSkillsMatch: 0,
          matchedSkills: [],
          criticalMissingSkills: [],
          skillGapSeverity: "high"
        },
        experienceAlignment: {
          levelMatch: "unknown",
          yearsMatch: "unknown",
          relevantExperience: "unknown",
          domainExperienceMatch: "unknown",
          recentExperienceMatch: "unknown"
        },
        strengths: [],
        recommendations: ["Unable to analyze - please check data quality"],
        rejectionReason: "AI response parsing failed"
      };
    }

    // Cache the result
    await setLLMCache(cacheKey, result, 1000 * 60 * 60 * 12); // 12 hours

    return result;
  } catch (error) {
    console.error('[MultipleJobMatcher] Error in performSingleMatch:', error);
    throw error;
  }
}

export async function matchMultipleJDsWithMultipleResumes(
  input: MultipleMatchInput,
  requestId?: string
): Promise<MultipleMatchResult[]> {
  const logger = createLogger(requestId, 'MultipleJobMatcher');

  try {
    const jdFileCount = input.jdFiles.length;
    const jdDataCount = input.jdDataList?.length || 0;
    const totalJDs = jdFileCount + jdDataCount;
    const totalCombinations = totalJDs * input.resumeFiles.length;

    logger.info('Starting multiple job matching', {
      jdCount: totalJDs,
      jdFileCount,
      jdDataCount,
      resumeCount: input.resumeFiles.length,
      totalCombinations
    });

    // Extract all JDs with caching - using controlled concurrency to avoid race conditions
    const extractionLogger = logger.child('Extraction');
    const jdExtractions: Array<{ index: number; data: JobDescriptionData; fileName: string }> = [];
    const jdErrors: any[] = [];

    // 1. Process JD Files
    if (input.jdFiles.length > 0) {
      extractionLogger.info('Extracting job descriptions from files', { count: input.jdFiles.length });

      const jdFileResults = await processBatch(
        input.jdFiles,
        async (file, index) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          extractionLogger.debug(`Processing JD ${index + 1}/${input.jdFiles.length}`, { fileName: file.name, bufferSize: buffer.length });

          const data = await extractWithCache(buffer, file.name, 'jd', input.tenantId) as JobDescriptionData;

          // Validate extraction result
          const isEmpty = !data.title && !data.company && (!data.skills || data.skills.length === 0);
          if (isEmpty) {
            extractionLogger.warn('⚠️  JD extraction returned EMPTY data!', {
              index,
              fileName: file.name,
              bufferSize: buffer.length,
              extractedData: data
            });
          } else {
            extractionLogger.debug('✓ JD extracted successfully', {
              index,
              fileName: file.name,
              title: data.title,
              company: data.company,
              skillsCount: data.skills?.length || 0
            });
          }

          return { index, data, fileName: file.name };
        },
        {
          concurrency: 1, // Process one at a time to avoid race conditions
          onProgress: (processed, total) => {
            extractionLogger.info('JD extraction progress', { processed, total });
          },
          onError: (error, item, index) => {
            extractionLogger.error('JD extraction failed', error, { fileName: (item as File).name, index });
          }
        }
      );

      jdExtractions.push(...jdFileResults.success);
      jdErrors.push(...jdFileResults.errors);
    }

    // 2. Process pre-extracted JD Data
    if (input.jdDataList && input.jdDataList.length > 0) {
      extractionLogger.info('Processing pre-extracted job descriptions', { count: input.jdDataList.length });

      input.jdDataList.forEach((data, i) => {
        jdExtractions.push({
          index: jdFileCount + i, // Offset index by file count
          data: data,
          fileName: `Job Description ${i + 1}` // Synthetic filename
        });
      });
    }

    // Extract all resumes with caching - using controlled concurrency to avoid race conditions
    extractionLogger.info('Extracting resumes', { count: input.resumeFiles.length });

    // Process resume extractions with controlled concurrency (1 at a time to avoid race conditions)
    const resumeExtractionResults = await processBatch(
      input.resumeFiles,
      async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        extractionLogger.debug(`Processing resume ${index + 1}/${input.resumeFiles.length}`, { fileName: file.name, bufferSize: buffer.length });

        const data = await extractWithCache(buffer, file.name, 'resume', input.tenantId) as ResumeData;

        // Validate extraction result
        const isEmpty = !data.name && !data.email && (!data.skills || data.skills.length === 0);
        if (isEmpty) {
          extractionLogger.warn('⚠️  Resume extraction returned EMPTY data!', {
            index,
            fileName: file.name,
            bufferSize: buffer.length,
            extractedData: data
          });
        } else {
          extractionLogger.debug('✓ Resume extracted successfully', {
            index,
            fileName: file.name,
            name: data.name,
            email: data.email,
            skillsCount: data.skills?.length || 0
          });
        }

        return { index, data, fileName: file.name };
      },
      {
        concurrency: 1, // Process one at a time to avoid race conditions
        onProgress: (processed, total) => {
          extractionLogger.info('Resume extraction progress', { processed, total });
        },
        onError: (error, item, index) => {
          extractionLogger.error('Resume extraction failed', error, { fileName: (item as File).name, index });
        }
      }
    );

    const resumeExtractions = resumeExtractionResults.success;

    // LOG EXTRACTION ERRORS IF ANY
    if (jdErrors.length > 0) {
      extractionLogger.error('⚠️  JD EXTRACTION ERRORS', undefined, {
        errorCount: jdErrors.length,
        errors: jdErrors.map(e => ({
          index: e.index,
          fileName: (e.item as File).name,
          error: e.error.message,
          stack: e.error.stack
        }))
      });
    }

    if (resumeExtractionResults.errors.length > 0) {
      extractionLogger.error('⚠️  RESUME EXTRACTION ERRORS', undefined, {
        errorCount: resumeExtractionResults.errors.length,
        errors: resumeExtractionResults.errors.map(e => ({
          index: e.index,
          fileName: (e.item as File).name,
          error: e.error.message,
          stack: e.error.stack
        }))
      });
    }

    extractionLogger.info('Extraction completed', {
      jdCount: jdExtractions.length,
      jdErrors: jdErrors.length,
      resumeCount: resumeExtractions.length,
      resumeErrors: resumeExtractionResults.errors.length
    });

    // Check if we have any successful extractions
    if (jdExtractions.length === 0) {
      throw new Error(`All JD extractions failed (or none provided)! ${jdErrors.length} errors occurred.`);
    }

    if (resumeExtractions.length === 0) {
      throw new Error(`All resume extractions failed! ${resumeExtractionResults.errors.length} errors occurred.`);
    }

    // Perform matching for all combinations with controlled concurrency
    const matchLogger = logger.child('Matching');
    let processedCount = 0;

    const matchProcessor = async (
      jdExtraction: typeof jdExtractions[0],
      resumeExtraction: typeof resumeExtractions[0],
      jdIndex: number,
      resumeIndex: number
    ) => {
      matchLogger.debug('Matching combination', {
        jdTitle: jdExtraction.data.title,
        candidateName: resumeExtraction.data.name,
        jdIndex,
        resumeIndex
      });

      const matchAnalysis = await performSingleMatch(jdExtraction.data, resumeExtraction.data);

      // Generate a summary explaining the matching criteria evaluation
      let summary = '';
      if (matchAnalysis.roleAlignment && matchAnalysis.skillsetMatch && matchAnalysis.experienceAlignment) {
        summary = `This match has a score of ${matchAnalysis.matchScore || 0}%. `;
        summary += `Role alignment is assessed as ${matchAnalysis.roleAlignment.assessment || 'not specified'}. `;
        summary += `The candidate possesses ${matchAnalysis.skillsetMatch.technicalSkillsMatch || 0}% of the required technical skills. `;
        summary += `Experience evaluation shows ${matchAnalysis.experienceAlignment.relevantExperience || 'no specific assessment'}. `;
        summary += `Domain experience match: ${matchAnalysis.experienceAlignment.domainExperienceMatch || 'not specified'}. `;
        summary += `Recent experience relevance: ${matchAnalysis.experienceAlignment.recentExperienceMatch || 'not specified'}.`;
      } else {
        summary = `This match has a score of ${matchAnalysis.matchScore || 0}%. `;
        summary += `Detailed criteria evaluation is not available.`;
      }

      // Return ALL matches regardless of score (no filtering)
      const matchResult: MultipleMatchResult = {
        jdIndex: jdExtraction.index,
        resumeIndex: resumeExtraction.index,
        jdTitle: jdExtraction.data.title || `JD ${jdExtraction.index + 1}`,
        candidateName: resumeExtraction.data.name || `Candidate ${resumeExtraction.index + 1}`,
        matchScore: matchAnalysis.matchScore || 0,
        matchedSkills: matchAnalysis.skillsetMatch?.matchedSkills || [],
        unmatchedSkills: matchAnalysis.skillsetMatch?.criticalMissingSkills || [],
        strengths: matchAnalysis.strengths || [],
        recommendations: matchAnalysis.recommendations || [],
        jdFileName: jdExtraction.fileName,
        resumeFileName: resumeExtraction.fileName,
        jdUrl: input.jdUrls?.[jdExtraction.index],
        resumeUrl: input.resumeUrls?.[resumeExtraction.index],
        summary: summary, // Add the summary field
        analysis: {
          ...matchAnalysis,
          // Add resume data for output formatting
          candidateEmail: resumeExtraction.data.email,
          candidatePhone: resumeExtraction.data.phone,
          candidateCertifications: resumeExtraction.data.certifications || [],
          candidateExperience: resumeExtraction.data.experience || [],
          candidateIndustrialExperienceYears: resumeExtraction.data.totalIndustrialExperienceYears || 0,
          candidateDomainExperienceYears: resumeExtraction.data.totalDomainExperienceYears || 0,
          requiredIndustrialExperienceYears: jdExtraction.data.requiredIndustrialExperienceYears || 0,
          requiredDomainExperienceYears: jdExtraction.data.requiredDomainExperienceYears || 0
        }
      };

      matchLogger.debug('Match result', {
        candidateName: matchResult.candidateName,
        jdTitle: matchResult.jdTitle,
        matchScore: matchResult.matchScore,
        isRelevant: matchAnalysis.relevantMatch,
        rejectionReason: matchAnalysis.rejectionReason
      });

      return matchResult;
    };

    // Process matrix with controlled concurrency (3 parallel operations)
    const batchResult = await processMatrix(
      jdExtractions,
      resumeExtractions,
      matchProcessor,
      {
        concurrency: 3,
        onProgress: (processed, total) => {
          if (processed % 5 === 0 || processed === total) {
            matchLogger.info('Matching progress', {
              processed,
              total,
              percentage: Math.round((processed / total) * 100)
            });
          }
        },
        onError: (error, item, index) => {
          matchLogger.error('Match processing failed', error, {
            index,
            item: item ? { jd: item.row?.data?.title, resume: item.col?.data?.name } : null
          });
        }
      }
    );

    // Get all match results (no filtering) and remove row/col index metadata
    const allMatchResults = batchResult.success
      .map(({ rowIndex, colIndex, ...matchResult }) => matchResult);

    // Debug logging
    if (allMatchResults.length === 0) {
      logger.error('No match results generated!', undefined, {
        totalProcessed: batchResult.totalProcessed,
        totalErrors: batchResult.totalErrors,
        successCount: batchResult.success.length,
        errorDetails: batchResult.errors.map(e => ({
          index: e.index,
          error: e.error.message
        }))
      });
    }

    logger.info('Matching completed', {
      totalProcessed: batchResult.totalProcessed,
      totalMatches: allMatchResults.length,
      errors: batchResult.totalErrors
    });

    // Sort results by match score (highest first)
    allMatchResults.sort((a, b) => b.matchScore - a.matchScore);

    return allMatchResults;
  } catch (error) {
    logger.error('Multiple job matching failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}