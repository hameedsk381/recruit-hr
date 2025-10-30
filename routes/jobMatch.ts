import { MatchResult } from "../services/jobMatcher";
import { extractResumeData } from "../services/resumeExtractor";
import { extractJobDescriptionData } from "../services/jdExtractor";
import { matchJobWithResume } from "../services/jobMatcher";

// Simple in-memory queue for processing requests
const requestQueue: Array<() => Promise<any>> = [];
let isProcessing = false;

// Process the queue
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('[JobMatchHandler] Queue task error:', error);
      }
      // Add a small delay between requests to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  isProcessing = false;
}

// Add task to queue
function addToQueue(task: () => Promise<any>) {
  requestQueue.push(task);
  processQueue();
}

export async function jobMatchHandler(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    // Prefer new key: job_description (fallback to jobDescription for backward compatibility)
    const jdFile = (formData.get('job_description') || formData.get('jobDescription')) as unknown;
    
    // Log all form data keys for debugging
    console.log('[JobMatchHandler] Form data keys:', Array.from(formData.keys()));
    
    // Use 'resumes' for all cases (single and multiple). Fallback to 'resume' for backward compatibility
    const resumeFiles: File[] = [];
    const resumesFromNewKey = formData.getAll('resumes');
    console.log(`[JobMatchHandler] Found ${resumesFromNewKey.length} item(s) in 'resumes' field`);
    resumesFromNewKey.forEach((item, index) => {
      if (item instanceof File) {
        console.log(`[JobMatchHandler] Resumes[${index}]: ${item.name} (${item.size} bytes)`);
        resumeFiles.push(item);
      } else {
        console.log(`[JobMatchHandler] Item ${index} in 'resumes' is not a File:`, typeof item);
      }
    });
    
    // Backward compatibility: single 'resume' or multiple 'resume'
    if (resumeFiles.length === 0) {
      const legacyResumes = formData.getAll('resume');
      console.log(`[JobMatchHandler] Falling back to 'resume' field, found ${legacyResumes.length} item(s)`);
      legacyResumes.forEach((item, index) => {
        if (item instanceof File) {
          console.log(`[JobMatchHandler] Legacy resume[${index}]: ${item.name} (${item.size} bytes)`);
          resumeFiles.push(item);
        }
      });
    }
    
    if (!jdFile || !(jdFile instanceof File)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No job description file provided or invalid file' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (resumeFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No resume file(s) provided or invalid file(s)' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Extract job description data
    const jdBuffer = await jdFile.arrayBuffer();
    const jdData = await extractJobDescriptionData(Buffer.from(jdBuffer));
    
    // Process resumes with rate limiting
    const results: any[] = [];
    const errors: any[] = [];
    
    // Process all resumes concurrently but with rate limiting
    const processResumePromises = resumeFiles.map(async (resumeFile, index) => {
      try {
        console.log(`[JobMatchHandler] Processing resume ${index + 1}: ${resumeFile.name}`);
        // Create a promise for this resume processing
        const processResume = async () => {
          const resumeBuffer = await resumeFile.arrayBuffer();
          const resumeData = await extractResumeData(Buffer.from(resumeBuffer));
          const matchResult: MatchResult = await matchJobWithResume(jdData, resumeData);
          
          // Generate a unique ID for this match analysis
          const jobId = crypto.randomUUID();
          
          // Ensure we have a valid total experience value
          let totalExperience = 0;
          
          // First, try to use the resume data value
          if (resumeData.totalIndustrialExperienceYears !== undefined && 
              resumeData.totalIndustrialExperienceYears !== null && 
              !isNaN(resumeData.totalIndustrialExperienceYears) &&
              resumeData.totalIndustrialExperienceYears > 0) {
            totalExperience = resumeData.totalIndustrialExperienceYears;
          }
          // If not available, try to get from match result
          else if (matchResult.candidateIndustrialExperienceYears && 
                   matchResult.candidateIndustrialExperienceYears > 0) {
            totalExperience = matchResult.candidateIndustrialExperienceYears;
          }
          
          return {
            Id: jobId,
            "Resume Data": {
              "Job Title": jdData.title,
              "Matching Percentage": (matchResult.matchScore || 0).toString(),
              "college_name": null,
              "company_names": [],
              "degree": null,
              "designation": null,
              "email": resumeData.email,
              "experience": resumeData.totalIndustrialExperienceYears || 0,
              "mobile_number": resumeData.phone,
              "name": resumeData.name,
              "no_of_pages": null,
              "skills": resumeData.skills,
              "certifications": resumeData.certifications,
              "total_experience": resumeData.experience || []
            },
            "Analysis": {
              "Matching Score": matchResult.matchScore || 0,
              "Unmatched Skills": matchResult.unmatchedSkills || [],
              "Matched Skills": matchResult.matchedSkills || [],
              "Matched Skills Percentage": matchResult.matchedSkillsPercentage ?? (function(){
                const total = (matchResult.matchedSkills || []).length + (matchResult.unmatchedSkills || []).length;
                const matched = (matchResult.matchedSkills || []).length;
                return total > 0 ? Math.round((matched / total) * 100) : 0;
              })(),
              "Unmatched Skills Percentage": matchResult.unmatchedSkillsPercentage ?? (function(){
                const total = (matchResult.matchedSkills || []).length + (matchResult.unmatchedSkills || []).length;
                const unmatched = (matchResult.unmatchedSkills || []).length;
                return total > 0 ? Math.round((unmatched / total) * 100) : 0;
              })(),
              "Strengths": matchResult.strengths || [],
              "Recommendations": matchResult.recommendations || [],
              "Required Industrial Experience": `${matchResult.requiredIndustrialExperienceYears || 0} years`,
              "Required Domain Experience": `${matchResult.requiredDomainExperienceYears || 0} years`,
              "Candidate Industrial Experience": matchResult.industrialExperienceDetails || `${matchResult.candidateIndustrialExperienceYears || totalExperience || 0} years`,
              "Candidate Domain Experience": matchResult.domainExperienceDetails || `${matchResult.candidateDomainExperienceYears || 0} years`,
              "Experience Threshold Compliance": matchResult.Analysis?.["Experience Threshold Compliance"] || "Not evaluated",
              "Recent Experience Relevance": matchResult.Analysis?.["Recent Experience Relevance"] || "Not evaluated"
            },
            // Add summary of analysis criteria
            "Analysis Summary": matchResult.summary || `This match was evaluated based on role relevance, skillset matching, and experience quality. The candidate has ${totalExperience || 0} years of industrial experience and matches ${matchResult.matchedSkillsPercentage ?? 0}% of the required skills.`
          };
        };
        
        // Add to processing queue
        const result = await new Promise((resolve, reject) => {
          addToQueue(async () => {
            try {
              const res = await processResume();
              resolve(res);
            } catch (error) {
              reject(error);
            }
          });
        });
        
        console.log(`[JobMatchHandler] Successfully processed resume ${index + 1}: ${resumeFile.name}`);
        return { index, result, error: null };
      } catch (error) {
        console.error(`[JobMatchHandler] Error processing resume ${index}:`, error);
        return { index, result: null, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    // Wait for all resume processing to complete
    const processedResults = await Promise.all(processResumePromises);
    
    // Sort results by original order and separate successful results from errors
    processedResults.sort((a, b) => a.index - b.index);
    
    for (const processed of processedResults) {
      if (processed.error) {
        errors.push({
          resumeIndex: processed.index,
          error: processed.error
        });
      } else {
        results.push(processed.result);
      }
    }
    
    console.log(`[JobMatchHandler] Processing complete. Results: ${results.length}, Errors: ${errors.length}`);
    
    // Format response to match expected structure
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Some resumes failed to process',
          errors: errors
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          "POST Response": results
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('[JobMatchHandler] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}