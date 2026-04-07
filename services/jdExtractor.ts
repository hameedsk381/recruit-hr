import { getPrompt } from "./promptRegistry";
import { groqChatCompletion } from "../utils/groqClient";
import { parsePDF } from "../utils/pdfParser";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { createHash } from "crypto";

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

// Function to extract JSON from AI response
function extractJsonFromResponse(response: string): any {
  // First try to parse the entire response
  try {
    return JSON.parse(response);
  } catch (e) {
    // Clean the response by removing markdown code blocks if present
    let cleanResponse = response.trim();

    // Remove markdown code block markers if present
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse.substring(7);
    }
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.substring(3);
    }
    if (cleanResponse.endsWith("```")) {
      cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
    }

    cleanResponse = cleanResponse.trim();

    // Look for JSON in the response
    const jsonStart = cleanResponse.indexOf("{");

    if (jsonStart !== -1) {
      let jsonString = cleanResponse.substring(jsonStart);

      // Count opening and closing braces to see if we're missing any
      const openBraces = (jsonString.match(/\{/g) || []).length;
      const closeBraces = (jsonString.match(/\}/g) || []).length;
      const openBrackets = (jsonString.match(/\[/g) || []).length;
      const closeBrackets = (jsonString.match(/\]/g) || []).length;

      // Add missing closing braces/brackets
      let missingBraces = openBraces - closeBraces;
      let missingBrackets = openBrackets - closeBrackets;

      // Add missing closing brackets first
      while (missingBrackets > 0) {
        jsonString += "]";
        missingBrackets--;
      }

      // Then add missing closing braces
      while (missingBraces > 0) {
        jsonString += "}";
        missingBraces--;
      }

      try {
        return JSON.parse(jsonString);
      } catch (e2) {
        // Try a more aggressive approach - find the last complete array or object
        const lastArrayStart = jsonString.lastIndexOf("[");
        const lastArrayEnd = jsonString.lastIndexOf("]");
        const lastObjectStart = jsonString.lastIndexOf("{");
        const lastObjectEnd = jsonString.lastIndexOf("}");

        // If we have an unclosed array, try to close it properly
        if (lastArrayStart > lastArrayEnd) {
          // Find where the array should end (look for the last string or object in the array)
          const lastQuote = jsonString.lastIndexOf('"');
          const lastBrace = jsonString.lastIndexOf('}');

          // Close the array at the appropriate position
          const arrayEndPos = Math.max(lastQuote, lastBrace) + 1;
          if (arrayEndPos > lastArrayStart) {
            jsonString = jsonString.substring(0, arrayEndPos) + "]" + jsonString.substring(arrayEndPos);
          }
        }

        // If we have an unclosed object, try to close it properly
        if (lastObjectStart > lastObjectEnd) {
          // Find where the object should end (look for the last quote or bracket)
          const lastQuote = jsonString.lastIndexOf('"');
          const lastBracket = jsonString.lastIndexOf(']');

          // Close the object at the appropriate position
          const objectEndPos = Math.max(lastQuote, lastBracket) + 1;
          if (objectEndPos > lastObjectStart) {
            jsonString = jsonString.substring(0, objectEndPos) + "}" + jsonString.substring(objectEndPos);
          }
        }

        try {
          return JSON.parse(jsonString);
        } catch (e3) {
          // If we still can't parse, throw the original error
          throw e;
        }
      }
    }
    // If no JSON-like structure found, throw the original error
    throw e;
  }
}

export async function extractJobDescriptionData(buffer: Buffer): Promise<JobDescriptionData> {
  try {
    // Create a cache key based on the buffer content
    const cacheKey = `jd_extract_${createHash('md5')
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
    const promptConfig = getPrompt('JD_EXTRACTION_V1');
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
    try {
      console.log('[JDExtractor] Attempting to parse JSON response...');
      let jdData: any = extractJsonFromResponse(response);

      console.log('[JDExtractor] JSON parsed successfully');
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
    } catch (parseError) {
      console.error('[JDExtractor] Error parsing JSON response:', parseError);
      console.error('[JDExtractor] Raw response:', response);
      throw new Error('Failed to parse job description data from AI response');
    }
  } catch (error) {
    console.error('[JDExtractor] Error:', error);
    throw new Error(`Failed to extract job description data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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