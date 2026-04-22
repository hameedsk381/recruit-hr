import { getPrompt } from "./promptRegistry";
import { groqChatCompletion } from "../utils/groqClient";
import { parsePDF } from "../utils/pdfParser";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { createHash } from "crypto";
import { extractJsonFromResponse } from "../utils/jsonParser";

// Interface for job description data
export interface JobDescriptionData {
  title: string;
  company: string;
  location: string;
  salary: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  industrialExperience: string[];
  domainExperience: string[];
  requiredIndustrialExperienceYears: number;
  requiredDomainExperienceYears: number;
  employmentType?: string; // Added field for employment type
  department?: string; // Added field for department
  description?: string; // Added field for full description
}

// New interface for the job posting format
export interface JobDescriptionResponse {
  title: string;
  companyName: string;
  location: string;
  type: 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship';
  experience: string;
  department: string;
  skills: string;
  salary: string;
  description: string;
}



export async function extractJobDescriptionData(buffer: Buffer): Promise<JobDescriptionData> {
  try {
    // Get prompt config from registry
    const promptConfig = getPrompt('JD_EXTRACTION_V1');
    
    // Create a cache key based on the buffer content and prompt version
    const cacheKey = `jd_extract_${promptConfig.id}_${promptConfig.version}_${createHash('md5')
      .update(buffer)
      .digest('hex')}`;
    
    console.log('[JDExtractor] Starting extraction, cache key:', cacheKey);

    // Try to get result from cache first
    const cachedResult = await getLLMCache(cacheKey);
    if (cachedResult) {
      console.log('[JDExtractor] Returning cached result');
      console.log('[JDExtractor] Cached data preview:', JSON.stringify({
        title: cachedResult.title,
        company: cachedResult.company,
        skillsCount: cachedResult.skills?.length || 0,
        requirementsCount: cachedResult.requirements?.length || 0
      }));
      return cachedResult as JobDescriptionData;
    }

    // Parse PDF to extract text
    console.log('[JDExtractor] Parsing PDF...');
    const text = await parsePDF(buffer);
    console.log(`[JDExtractor] PDF parsed - Text length: ${text.length} characters`);

    if (text.length === 0) {
      console.error('[JDExtractor] ERROR: PDF text extraction returned EMPTY string!');
      console.error('[JDExtractor] This usually means:');
      console.error('[JDExtractor]   1. PDF is a scanned image (not text-based)');
      console.error('[JDExtractor]   2. PDF is corrupted or invalid');
      console.error('[JDExtractor]   3. PDF format is not supported by unpdf');
      console.error('[JDExtractor] File:', buffer.length, 'bytes');

      // THROW ERROR instead of returning empty data
      throw new Error(`PDF text extraction failed for JD - extracted 0 characters from ${buffer.length} byte file`);
    }

    console.log(`[JDExtractor] First 300 chars of extracted text: ${text.substring(0, 300)}...`);

    // Get prompt config from registry
    console.log(`[JDExtractor] Using prompt: ${promptConfig.id} v${promptConfig.version}`);

    // Use Groq to extract structured data with lower temperature for more deterministic output
    // and limited tokens to reduce costs and improve speed
    console.log('[JDExtractor] Calling Groq API...');
    const response = await groqChatCompletion(
      "You are an expert HR assistant specializing in extracting information from job descriptions.",
      `${promptConfig.template}\n\nJob description text:\n${text.substring(0, 10000)}`,
      promptConfig.modelConfig.temperature,
      promptConfig.modelConfig.maxTokens
    );

    console.log(`[JDExtractor] Groq API response length: ${response.length} characters`);
    console.log(`[JDExtractor] Groq API response preview: ${response.substring(0, 500)}...`);

    if (!response || response.length === 0) {
      console.error('[JDExtractor] ERROR: Groq API returned EMPTY response!');
      throw new Error('Groq API returned empty response');
    }

    // Parse the JSON response
    let jdData: any;
    try {
      console.log('[JDExtractor] Attempting to parse JSON response...');
      jdData = extractJsonFromResponse(response);
      console.log('[JDExtractor] JSON parsed successfully');
    } catch (parseError) {
      console.error('[JDExtractor] Error parsing JSON response:', parseError);
      console.error('[JDExtractor] Raw response:', response);
      throw new Error('Failed to parse job description data from AI response');
    }

    // Check for validation errors from LLM
    if (jdData.error === 'DOCUMENT_IS_RESUME') {
      // Throw with a prefix so heuristic validator can also catch it
      throw new Error(`DOCUMENT_IS_RESUME: ${jdData.message || 'The uploaded document appears to be a resume, not a job description.'}`);
    }

    console.log('[JDExtractor] Parsed data keys:', Object.keys(jdData));
    console.log('[JDExtractor] Raw AI response:', JSON.stringify(jdData, null, 2));

    // Check for empty critical fields
    if (!jdData.title || jdData.title === '') {
      console.warn('[JDExtractor] WARNING: title is empty!');
    }
    if (!jdData.company || jdData.company === '') {
      console.warn('[JDExtractor] WARNING: company is empty!');
    }
    if (!jdData.skills || jdData.skills.length === 0) {
      console.warn('[JDExtractor] WARNING: skills array is empty!');
    }

    // Ensure proper data types
    if (jdData.industrialExperience && !Array.isArray(jdData.industrialExperience)) {
      jdData.industrialExperience = [String(jdData.industrialExperience)];
    }

    if (jdData.domainExperience && !Array.isArray(jdData.domainExperience)) {
      jdData.domainExperience = [String(jdData.domainExperience)];
    }

    if (jdData.requiredIndustrialExperienceYears && typeof jdData.requiredIndustrialExperienceYears !== 'number') {
      jdData.requiredIndustrialExperienceYears = Number(jdData.requiredIndustrialExperienceYears) || 0;
    }

    if (jdData.requiredDomainExperienceYears && typeof jdData.requiredDomainExperienceYears !== 'number') {
      jdData.requiredDomainExperienceYears = Number(jdData.requiredDomainExperienceYears) || 0;
    }

    // Ensure all array fields are actually arrays
    const arrayFields = ['requirements', 'responsibilities', 'skills'];
    arrayFields.forEach(field => {
      if (jdData[field] && !Array.isArray(jdData[field])) {
        jdData[field] = [String(jdData[field])];
      } else if (!jdData[field]) {
        jdData[field] = [];
      }
    });

    // Final validation of critical fields
    const criticalFields = ['title', 'company', 'skills', 'requirements'];
    const emptyFields = criticalFields.filter(field => {
      if (Array.isArray(jdData[field])) {
        return jdData[field].length === 0;
      }
      return !jdData[field] || jdData[field] === '';
    });

    if (emptyFields.length > 0) {
      console.warn(`[JDExtractor] WARNING: The following fields are empty: ${emptyFields.join(', ')}`);
    }

    console.log('[JDExtractor] Final data summary:', {
      title: jdData.title || 'EMPTY',
      company: jdData.company || 'EMPTY',
      location: jdData.location || 'EMPTY',
      skillsCount: jdData.skills?.length || 0,
      requirementsCount: jdData.requirements?.length || 0,
      requiredYears: jdData.requiredIndustrialExperienceYears
    });

    // Cache the result for 24 hours
    await setLLMCache(cacheKey, jdData, 1000 * 60 * 60 * 24);

    return jdData as JobDescriptionData;
  } catch (error) {
    if (error instanceof Error && error.message.includes('DOCUMENT_IS_RESUME')) {
      throw error; // Propagate validation errors directly
    }
    console.error('[JDExtractor] Error:', error);
    throw new Error(`Failed to extract job description data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractJobDescriptionDataFromText(text: string): Promise<JobDescriptionData> {
  try {
    const promptConfig = getPrompt('JD_EXTRACTION_V1');

    // Create a cache key based on the text content and prompt version
    const cacheKey = `jd_extract_text_${promptConfig.id}_${promptConfig.version}_${createHash('md5').update(text).digest('hex')}`;

    console.log('[JDExtractor] Starting text extraction, cache key:', cacheKey);

    // Try to get result from cache first
    const cachedResult = await getLLMCache(cacheKey);
    if (cachedResult) {
      console.log('[JDExtractor] Returning cached result');
      return cachedResult as JobDescriptionData;
    }

    console.log('[JDExtractor] Calling Groq API for text...');
    const response = await groqChatCompletion(
      "You are an expert HR assistant specializing in extracting information from job descriptions.",
      `${promptConfig.template}\n\nJob description text:\n${text.substring(0, 10000)}`,
      promptConfig.modelConfig.temperature,
      promptConfig.modelConfig.maxTokens
    );

    if (!response || response.length === 0) {
      throw new Error('Groq API returned empty response');
    }

    // Parse the JSON response
    let jdData: any;
    try {
      jdData = extractJsonFromResponse(response);
    } catch (parseError) {
      console.error('[JDExtractor] Error parsing JSON response:', parseError);
      throw new Error('Failed to parse job description data from AI response');
    }

    // Check for validation errors from LLM
    if (jdData.error === 'DOCUMENT_IS_RESUME') {
      throw new Error(`DOCUMENT_IS_RESUME: ${jdData.message || 'The provided text appears to be a resume, not a job description.'}`);
    }

    // Normalization logic
    if (jdData.industrialExperience && !Array.isArray(jdData.industrialExperience)) {
      jdData.industrialExperience = [String(jdData.industrialExperience)];
    }
    if (jdData.domainExperience && !Array.isArray(jdData.domainExperience)) {
      jdData.domainExperience = [String(jdData.domainExperience)];
    }
    if (jdData.requiredIndustrialExperienceYears && typeof jdData.requiredIndustrialExperienceYears !== 'number') {
      jdData.requiredIndustrialExperienceYears = Number(jdData.requiredIndustrialExperienceYears) || 0;
    }
    const arrayFields = ['requirements', 'responsibilities', 'skills'];
    arrayFields.forEach(field => {
      if (jdData[field] && !Array.isArray(jdData[field])) {
        jdData[field] = [String(jdData[field])];
      } else if (!jdData[field]) {
        jdData[field] = [];
      }
    });

    // Cache the result
    await setLLMCache(cacheKey, jdData, 1000 * 60 * 60 * 24);

    return jdData as JobDescriptionData;
  } catch (error) {
    if (error instanceof Error && error.message.includes('DOCUMENT_IS_RESUME')) {
      throw error;
    }
    console.error('[JDExtractor] Error in extractJobDescriptionDataFromText:', error);
    throw new Error(`Failed to extract job description data from text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// New function to transform JobDescriptionData to JobDescriptionResponse
export function transformToJobDescriptionResponse(jdData: JobDescriptionData): JobDescriptionResponse {
  // Map employment type
  let employmentType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship' = 'Full-Time'; // Default

  if (jdData.employmentType) {
    const type = jdData.employmentType.toLowerCase();
    if (type.includes('part')) {
      employmentType = 'Part-Time';
    } else if (type.includes('contract')) {
      employmentType = 'Contract';
    } else if (type.includes('intern')) {
      employmentType = 'Internship';
    }
  }

  return {
    title: jdData.title || '',
    companyName: jdData.company || '',
    location: jdData.location || '',
    type: employmentType,
    experience: jdData.requiredIndustrialExperienceYears ? `${jdData.requiredIndustrialExperienceYears}+ years` : '',
    department: jdData.department || '',
    skills: jdData.skills ? jdData.skills.join(', ') : '',
    salary: jdData.salary || '',
    description: jdData.description || (jdData.requirements ? jdData.requirements.join(' ') : '')
  };
}