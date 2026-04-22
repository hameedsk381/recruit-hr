import { groqChatCompletion } from "../utils/groqClient";
import { parsePDF } from "../utils/pdfParser";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { getPrompt } from "./promptRegistry";
import { createHash } from "crypto";
import { getMongoDb } from "../utils/mongoClient";
import { extractJsonFromResponse } from "../utils/jsonParser";

// Interface for resume data
export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  photo?: string;
  address?: string;
  nationality?: string;
  skills: string[];
  experience: any[];
  education: string[];
  certifications: string[];
  industrialExperience: string[];
  domainExperience: string[];
  totalIndustrialExperienceYears: number;
  totalDomainExperienceYears: number;
}

export interface BlindScreeningSettings {
  enabled: boolean;
  redactFields: Array<'name' | 'email' | 'phone' | 'photo' | 'address' | 'linkedin' | 'nationality'>;
  revealAfterStage: 'shortlist' | 'interview' | 'offer' | 'never';
}

/**
 * Apply blind screening to a resume — redact PII fields per tenant settings.
 * Keeps skills, experience, education, certifications intact.
 */
export function applyBlindMode(resume: ResumeData, settings: BlindScreeningSettings): ResumeData {
  if (!settings.enabled) return resume;

  const redact = (field: BlindScreeningSettings['redactFields'][number]) =>
    settings.redactFields.includes(field) ? '[REDACTED]' : undefined;

  return {
    ...resume,
    name: redact('name') ?? resume.name,
    email: redact('email') ?? resume.email,
    phone: redact('phone') ?? resume.phone,
    linkedin: redact('linkedin') ?? resume.linkedin,
    photo: redact('photo') ? '[REDACTED]' : resume.photo,
    address: redact('address') ?? resume.address,
    nationality: redact('nationality') ?? resume.nationality,
    // Skills, experience, education, certifications are NEVER redacted
  };
}

// (Import moved to top)

// ... (Prompt constant removed in favor of Prompt Registry)


// Helper function to calculate years between dates
function calculateYearsBetweenDates(startDate: string, endDate: string): number {
  // Handle "present" or "current" as end date
  if (endDate.toLowerCase().includes('present') || endDate.toLowerCase().includes('current')) {
    endDate = new Date().getFullYear().toString();
  }

  // Try to parse different date formats
  const startYear = extractYear(startDate);
  const endYear = extractYear(endDate);

  if (startYear && endYear && startYear <= endYear) {
    // Calculate fractional years for partial years
    let years = endYear - startYear;

    // Handle month-level precision if available
    const startMonth = extractMonth(startDate);
    const endMonth = extractMonth(endDate);

    if (startMonth && endMonth) {
      const monthDiff = endMonth - startMonth;
      years += monthDiff / 12;
    }

    return Math.max(0, years);
  }

  return 0;
}

// Helper function to extract year from date string
function extractYear(dateStr: string): number | null {
  // Pattern to match 4-digit years
  const yearPattern = /\b(19|20)\d{2}\b/;
  const match = dateStr.match(yearPattern);
  return match ? parseInt(match[0]) : null;
}

// Helper function to extract month from date string
function extractMonth(dateStr: string): number | null {
  // Pattern to match month names or numbers
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthPattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|0?[1-9]|1[0-2])\b/i;
  const match = dateStr.match(monthPattern);

  if (match) {
    const month = match[0].toLowerCase();
    if (isNaN(parseInt(month))) {
      // Month name
      return monthNames.indexOf(month.substring(0, 3)) + 1;
    } else {
      // Month number
      return parseInt(month);
    }
  }

  return null;
}

// Helper function to extract years from text using regex patterns
function extractYearsFromText(text: string): number {
  let totalYears = 0;

  // Handle "2016-2020" format specifically
  const yearRangePattern = /\b(20[0-2]\d)\s*[-–]\s*(?:(20[0-2]\d)|present|current)\b/gi;
  let match;
  while ((match = yearRangePattern.exec(text)) !== null) {
    const startYear = parseInt(match[1]);
    const endYearStr = match[2] ? match[2].toLowerCase() : 'present';

    let endYear: number;
    if (endYearStr === 'present' || endYearStr === 'current') {
      endYear = new Date().getFullYear();
    } else {
      endYear = parseInt(endYearStr);
    }

    if (!isNaN(startYear) && !isNaN(endYear) && startYear <= endYear && startYear >= 1900 && endYear <= 2030) {
      const years = endYear - startYear;
      totalYears = Math.max(totalYears, years); // Take maximum period
    }
  }

  // Handle "Aug 2024 - Sep 2024" format
  const monthYearPattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20[0-2]\d)\s*[-–]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20[0-2]\d)|(present|current))/gi;
  while ((match = monthYearPattern.exec(text)) !== null) {
    const startYear = parseInt(match[1]);
    const endYearStr = match[2] || (match[3] ? match[3].toLowerCase() : 'present');

    let endYear: number;
    if (endYearStr === 'present' || endYearStr === 'current') {
      endYear = new Date().getFullYear();
    } else {
      endYear = parseInt(endYearStr);
    }

    if (!isNaN(startYear) && !isNaN(endYear) && startYear <= endYear && startYear >= 1900 && endYear <= 2030) {
      const years = endYear - startYear;
      // For month-level precision, we might have partial years
      if (years === 0) {
        // Same year, so less than 1 year
        totalYears = Math.max(totalYears, 0.1); // At least 1 month
      } else {
        totalYears = Math.max(totalYears, years);
      }
    }
  }

  // Handle "X years" or "X yrs" format
  const simpleYearPattern = /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/gi;
  while ((match = simpleYearPattern.exec(text)) !== null) {
    const years = parseFloat(match[1]);
    if (!isNaN(years) && years > 0 && years <= 50) {
      totalYears = Math.max(totalYears, years);
    }
  }

  return Math.round(totalYears * 10) / 10; // Round to 1 decimal place
}

// Function to calculate total experience from experience text
function calculateTotalExperience(experience: any[]): number {
  let totalYears = 0;

  // Handle case where experience is an array of objects (new format)
  if (experience && Array.isArray(experience) && experience.length > 0) {
    // Check if it's an array of objects with duration properties
    if (typeof experience[0] === 'object' && experience[0] !== null) {
      // For each experience entry, try to calculate duration and sum them up
      const validDurations: number[] = [];

      for (const exp of experience) {
        let expYears = 0;

        // Check duration field
        if (exp.duration) {
          expYears = extractYearsFromText(exp.duration);
        }

        // Only count valid durations (greater than 0)
        if (expYears > 0) {
          validDurations.push(expYears);
          totalYears += expYears; // Sum up all valid durations
        }
      }

      // If we still have 0, try to extract from all duration texts combined
      if (totalYears === 0) {
        // Extract all duration information from objects
        const durationTexts: string[] = [];
        for (const exp of experience) {
          if (exp.duration) {
            durationTexts.push(exp.duration);
          }
        }

        // Join all duration texts for pattern matching
        if (durationTexts.length > 0) {
          const experienceText = durationTexts.join(' ').toLowerCase();
          totalYears = extractYearsFromText(experienceText);
        }
      }
    }
    // Handle case where experience is an array of strings (old format)
    else if (typeof experience[0] === 'string') {
      const experienceText = experience.join(' ').toLowerCase();
      totalYears = extractYearsFromText(experienceText);
    }
  }

  // Cap at reasonable maximum (40 years - no one has more)
  if (totalYears > 40) {
    totalYears = 40;
  }

  return Math.round(totalYears * 10) / 10; // Round to 1 decimal place
}

// Independent experience calculator - parses raw resume text to verify AI calculation
function calculateIndependentExperience(rawText: string): number {
  const text = rawText.toLowerCase();
  let totalMonths = 0;

  // Pattern: "Month Year - Month Year" or "Month Year to Month Year"
  const monthYearPattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d{2}|19\d{2})\s*(?:[-–]|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d{2}|19\d{2})|(present|current|n\.y\.|now))\b/gi;
  let match;
  while ((match = monthYearPattern.exec(text)) !== null) {
    const startMonthIdx = getMonthIndex(match[1]);
    const startYear = parseInt(match[2]);
    let endMonthIdx: number, endYear: number;

    if (match[4]) {
      endMonthIdx = getMonthIndex(match[3]);
      endYear = parseInt(match[4]);
    } else {
      endMonthIdx = new Date().getMonth();
      endYear = new Date().getFullYear();
    }

    if (startMonthIdx >= 0 && endYear >= startYear) {
      const months = (endYear - startYear) * 12 + (endMonthIdx - startMonthIdx);
      if (months > 0 && months <= 480) totalMonths += months;
    }
  }

  // Pattern: "Year - Year" (fallback when no month)
  const yearRangePattern = /\b(20\d{2}|19\d{2})\s*[-–]\s*((20\d{2}|19\d{2})|(present|current))\b/gi;
  while ((match = yearRangePattern.exec(text)) !== null) {
    const startYear = parseInt(match[1]);
    let endYear: number;

    if (match[3]) {
      endYear = parseInt(match[3]);
    } else {
      endYear = new Date().getFullYear();
    }

    if (endYear >= startYear) {
      const years = endYear - startYear;
      if (years > 0 && years <= 40) totalMonths += years * 12;
    }
  }

  return Math.round((totalMonths / 12) * 10) / 10;
}

function getMonthIndex(monthStr: string): number {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const idx = months.findIndex(m => monthStr.toLowerCase().startsWith(m));
  return idx >= 0 ? idx : 0;
}

export async function extractRawResumeData(buffer: Buffer): Promise<ResumeData> {
  try {
    // Create a cache key based on the buffer content
    const cacheKey = `resume_extract_${createHash('md5')
      .update(buffer)
      .digest('hex')}`;

    console.log('[ResumeExtractor] Starting extraction, cache key:', cacheKey);

    // Try to get result from cache first
    const cachedResult = await getLLMCache(cacheKey);
    if (cachedResult) {
      console.log('[ResumeExtractor] Returning cached result');
      console.log('[ResumeExtractor] Cached data preview:', JSON.stringify({
        name: cachedResult.name,
        email: cachedResult.email,
        skillsCount: cachedResult.skills?.length || 0,
        experienceCount: cachedResult.experience?.length || 0
      }));
      return cachedResult as ResumeData;
    }

    // Parse PDF to extract text
    console.log('[ResumeExtractor] Parsing PDF...');
    let text = '';
    try {
      text = await parsePDF(buffer);
      console.log(`[ResumeExtractor] PDF parsed - Text length: ${text.length} characters`);
    } catch (pdfError) {
      console.warn('[ResumeExtractor] PDF parsing failed, attempting to read as text', pdfError);
      text = buffer.toString('utf-8');
      console.log(`[ResumeExtractor] Read as text - Text length: ${text.length} characters`);
    }

    if (text.length === 0) {
      console.error('[ResumeExtractor] ERROR: PDF text extraction returned EMPTY string!');
      console.error('[ResumeExtractor] This usually means:');
      console.error('[ResumeExtractor]   1. PDF is a scanned image (not text-based)');
      console.error('[ResumeExtractor]   2. PDF is corrupted or invalid');
      console.error('[ResumeExtractor]   3. PDF format is not supported by unpdf');
      console.error('[ResumeExtractor] File:', buffer.length, 'bytes');

      // THROW ERROR instead of returning empty data
      throw new Error(`PDF text extraction failed for resume - extracted 0 characters from ${buffer.length} byte file`);
    }

    console.log(`[ResumeExtractor] First 300 chars of extracted text: ${text.substring(0, 300)}...`);

    // Use Groq to extract structured data with lower temperature for more deterministic output
    // and limited tokens to reduce costs and improve speed
    // Get prompt config from registry
    const promptConfig = getPrompt('RESUME_EXTRACTION_V1');
    console.log(`[ResumeExtractor] Using prompt: ${promptConfig.id} v${promptConfig.version}`);

    // Use Groq to extract structured data with lower temperature for more deterministic output
    // and limited tokens to reduce costs and improve speed
    console.log('[ResumeExtractor] Calling Groq API...');
    const response = await groqChatCompletion(
      "You are an expert HR assistant specializing in extracting information from resumes. Respond in valid JSON.",
      `${promptConfig.template}\n\nResume text:\n${text.substring(0, 10000)}`,
      promptConfig.modelConfig.temperature,
      promptConfig.modelConfig.maxTokens,
      { type: "json_object" }
    );

    console.log(`[ResumeExtractor] Groq API response length: ${response.length} characters`);
    console.log(`[ResumeExtractor] Groq API response preview: ${response.substring(0, 500)}...`);

    if (!response || response.length === 0) {
      console.error('[ResumeExtractor] ERROR: Groq API returned EMPTY response!');
      throw new Error('Groq API returned empty response');
    }

    // Parse the JSON response
    try {
      console.log('[ResumeExtractor] Attempting to parse JSON response...');
      let resumeData: any = extractJsonFromResponse(response);

      console.log('[ResumeExtractor] JSON parsed successfully');
      console.log('[ResumeExtractor] Parsed data keys:', Object.keys(resumeData));
      console.log('[ResumeExtractor] Raw AI response:', JSON.stringify(resumeData, null, 2));

      // Check for empty critical fields
      if (!resumeData.name || resumeData.name === '') {
        console.warn('[ResumeExtractor] WARNING: name is empty!');
      }
      if (!resumeData.email || resumeData.email === '') {
        console.warn('[ResumeExtractor] WARNING: email is empty!');
      }
      if (!resumeData.skills || resumeData.skills.length === 0) {
        console.warn('[ResumeExtractor] WARNING: skills array is empty!');
      }

      // Ensure proper data types
      if (resumeData.industrialExperience && !Array.isArray(resumeData.industrialExperience)) {
        resumeData.industrialExperience = [String(resumeData.industrialExperience)];
      }

      if (resumeData.domainExperience && !Array.isArray(resumeData.domainExperience)) {
        resumeData.domainExperience = [String(resumeData.domainExperience)];
      }

      // Debug: Log experience data
      console.log('[ResumeExtractor] Experience data:', JSON.stringify(resumeData.experience, null, 2));
      console.log('[ResumeExtractor] AI provided totalIndustrialExperienceYears:', resumeData.totalIndustrialExperienceYears);

      // Independent calculation to verify AI output
      const independentCalc = calculateIndependentExperience(text);
      console.log('[ResumeExtractor] Independent calculation:', independentCalc, 'years');

      // Ensure we have a valid number for total industrial experience
      let aiProvidedYears: number;
      if (resumeData.totalIndustrialExperienceYears === undefined ||
        resumeData.totalIndustrialExperienceYears === null ||
        isNaN(Number(resumeData.totalIndustrialExperienceYears))) {
        // Fallback: calculate from experience text if AI didn't provide it
        console.log('[ResumeExtractor] Using fallback calculation for total experience');
        aiProvidedYears = calculateTotalExperience(resumeData.experience || []);
        console.log('[ResumeExtractor] Fallback calculation result:', aiProvidedYears);
      } else {
        aiProvidedYears = Number(resumeData.totalIndustrialExperienceYears) || 0;
        console.log('[ResumeExtractor] Using AI provided total experience:', aiProvidedYears);
      }

      // Use AI value if reasonable, otherwise use independent calculation
      if (aiProvidedYears > 0 && aiProvidedYears <= 40) {
        resumeData.totalIndustrialExperienceYears = aiProvidedYears;
      } else if (independentCalc > 0) {
        console.log('[ResumeExtractor] AI value unreasonable, using independent calculation');
        resumeData.totalIndustrialExperienceYears = independentCalc;
      } else {
        resumeData.totalIndustrialExperienceYears = aiProvidedYears;
      }

      console.log('[ResumeExtractor] Final verified experience:', resumeData.totalIndustrialExperienceYears, 'years');

      if (resumeData.totalDomainExperienceYears && typeof resumeData.totalDomainExperienceYears !== 'number') {
        resumeData.totalDomainExperienceYears = Number(resumeData.totalDomainExperienceYears) || 0;
      }

      // Ensure all array fields are actually arrays
      const arrayFields = ['skills', 'experience', 'education', 'certifications'];
      arrayFields.forEach(field => {
        if (resumeData[field] && !Array.isArray(resumeData[field])) {
          resumeData[field] = [String(resumeData[field])];
        } else if (!resumeData[field]) {
          resumeData[field] = [];
        }
      });

      console.log('[ResumeExtractor] Final totalIndustrialExperienceYears:', resumeData.totalIndustrialExperienceYears);

      // Final validation of critical fields
      const criticalFields = ['name', 'email', 'skills', 'experience'];
      const emptyFields = criticalFields.filter(field => {
        if (Array.isArray(resumeData[field])) {
          return resumeData[field].length === 0;
        }
        return !resumeData[field] || resumeData[field] === '';
      });

      if (emptyFields.length > 0) {
        console.warn(`[ResumeExtractor] WARNING: The following fields are empty: ${emptyFields.join(', ')}`);
      }

      console.log('[ResumeExtractor] Final data summary:', {
        name: resumeData.name || 'EMPTY',
        email: resumeData.email || 'EMPTY',
        phone: resumeData.phone || 'EMPTY',
        skillsCount: resumeData.skills?.length || 0,
        experienceCount: resumeData.experience?.length || 0,
        totalYears: resumeData.totalIndustrialExperienceYears
      });

      // Cache the result for 24 hours
      await setLLMCache(cacheKey, resumeData, 1000 * 60 * 60 * 24);

      return resumeData as ResumeData;
    } catch (parseError) {
      console.error('[ResumeExtractor] Error parsing JSON response:', parseError);
      console.error('[ResumeExtractor] Raw response:', response);
      throw new Error('Failed to parse resume data from AI response');
    }
  } catch (error) {
    console.error('[ResumeExtractor] Error:', error);
    throw new Error(`Failed to extract resume data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractResumeData(buffer: Buffer, tenantId?: string): Promise<ResumeData> {
  const rawData = await extractRawResumeData(buffer);
  
  if (!tenantId) return rawData;
  
  try {
    const db = getMongoDb();
    if (!db) return rawData;
    
    const tenantObj = await db.collection('tenants').findOne({ tenantId });
    if (tenantObj && tenantObj.blindScreening && tenantObj.blindScreening.enabled) {
        console.log(`[ResumeExtractor] Applying blind screening for tenant ${tenantId}`);
        return applyBlindMode(rawData, tenantObj.blindScreening);
    }
  } catch (error) {
    console.error('[ResumeExtractor] Failed to apply blind screening:', error);
  }
  
  return rawData;
}