import { matchMultipleJDsWithMultipleResumes, type MultipleMatchInput, type MultipleMatchResult } from '../services/multipleJobMatcher';
import { validateFiles, validateBatchLimits } from '../utils/validators';
import { downloadMultipleFiles, validateUrls } from '../utils/fileDownloader';
import { JobDescriptionData } from '../services/jdExtractor';
import { initializeRequestContext } from '../utils/requestContext';

import { AuthContext } from '../middleware/authMiddleware';

export async function multipleJobMatchHandler(req: Request, context: AuthContext): Promise<Response> {
  // Initialize request context with Tenant ID and Request ID
  const { requestId, tenantId, logger } = initializeRequestContext(req, 'MultipleJobMatchHandler', context.tenantId, context.userId);

  try {
    logger.info('Received multiple job match request', { tenantId });

    const contentType = req.headers.get('content-type') || '';
    let jdFiles: File[] = [];
    let resumeFiles: File[] = [];
    let jdDataList: JobDescriptionData[] = [];
    let jdUrls: string[] | undefined;
    let resumeUrls: string[] | undefined;

    // Check if request is JSON (URLs or Data) or FormData (file uploads)
    if (contentType.includes('application/json')) {
      // Handle URL-based or Data-based input
      logger.info('Processing JSON input');

      let body: any;
      try {
        body = await req.json();
      } catch (err) {
        logger.error('Failed to parse JSON body', err as Error);
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400 });
      }

      const jdUrlsArray = body.job_description_urls || body.jd_urls || body.jdUrls || [];
      const resumeUrlsArray = body.resume_urls || body.resumeUrls || [];
      const jdData = body.job_description_data || body.jd_data || body.jdData;

      // Store JDs from data
      if (jdData) {
        if (Array.isArray(jdData)) {
          jdDataList = jdData;
        } else {
          jdDataList = [jdData];
        }
        logger.info('Received JD data from JSON body', { count: jdDataList.length });
      }

      // Process URLs if present
      if (jdUrlsArray.length > 0 || resumeUrlsArray.length > 0) {

        // Store URLs for later use
        jdUrls = jdUrlsArray;
        resumeUrls = resumeUrlsArray;

        // Validate URLs
        if (jdUrlsArray.length > 0) {
          const jdUrlValidation = validateUrls(jdUrlsArray);
          if (!jdUrlValidation.valid) {
            logger.error('JD URL validation failed', undefined, { error: jdUrlValidation.error, invalidUrls: jdUrlValidation.invalidUrls });
            return new Response(
              JSON.stringify({
                success: false,
                requestId,
                error: jdUrlValidation.error,
                invalidUrls: jdUrlValidation.invalidUrls
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          // Download JD files
          logger.info('Downloading job description files', { count: jdUrlsArray.length });
          const jdDownloads = await downloadMultipleFiles(jdUrlsArray, (downloaded, total) => {
            logger.debug('JD download progress', { downloaded, total });
          });

          if (jdDownloads.failed.length > 0) {
            logger.error('Some JD files failed to download', undefined, { failures: jdDownloads.failed });
            return new Response(
              JSON.stringify({
                success: false,
                requestId,
                error: 'Failed to download some job description files',
                failures: jdDownloads.failed
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          jdFiles = jdDownloads.successful.map(d => d.file);
        }

        if (resumeUrlsArray.length > 0) {
          const resumeUrlValidation = validateUrls(resumeUrlsArray);
          if (!resumeUrlValidation.valid) {
            logger.error('Resume URL validation failed', undefined, { error: resumeUrlValidation.error, invalidUrls: resumeUrlValidation.invalidUrls });
            return new Response(
              JSON.stringify({
                success: false,
                requestId,
                error: resumeUrlValidation.error,
                invalidUrls: resumeUrlValidation.invalidUrls
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          // Download resume files
          logger.info('Downloading resume files', { count: resumeUrlsArray.length });
          const resumeDownloads = await downloadMultipleFiles(resumeUrlsArray, (downloaded, total) => {
            logger.debug('Resume download progress', { downloaded, total });
          });

          if (resumeDownloads.failed.length > 0) {
            logger.error('Some resume files failed to download', undefined, { failures: resumeDownloads.failed });
            return new Response(
              JSON.stringify({
                success: false,
                requestId,
                error: 'Failed to download some resume files',
                failures: resumeDownloads.failed
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          resumeFiles = resumeDownloads.successful.map(d => d.file);
        }
      }

      let formData: FormData;
      try {
        formData = await req.formData();
      } catch (err) {
        logger.error('Failed to parse FormData', err as Error);
        return new Response(JSON.stringify({ success: false, error: 'Invalid FormData' }), { status: 400 });
      }

      // Get all JD files (support multiple keys for consistency)
      const jdItems = [
        ...formData.getAll('job_descriptions'),
        ...formData.getAll('job_description'),
        ...formData.getAll('jd')
      ].filter(item => item instanceof File) as File[];

      logger.debug('Processing job description files', { count: jdItems.length });

      jdItems.forEach((item, index) => {
        logger.debug('JD file received', { index, fileName: item.name, size: item.size });
        jdFiles.push(item);
      });

      // Get JD Data from FormData
      const jdDataStr = formData.get('job_description_data');
      if (typeof jdDataStr === 'string' && jdDataStr.trim()) {
        try {
          const parsedData = JSON.parse(jdDataStr);
          if (Array.isArray(parsedData)) {
            jdDataList = parsedData;
          } else {
            jdDataList = [parsedData];
          }
          logger.info('Received JD data from FormData', { count: jdDataList.length });
        } catch (e) {
          logger.error('Failed to parse job_description_data from FormData', e instanceof Error ? e : new Error(String(e)));
        }
      }

      // Get all resume files
      const resumeItems = formData.getAll('resumes');
      logger.debug('Processing resume files', { count: resumeItems.length });

      resumeItems.forEach((item, index) => {
        if (item instanceof File) {
          logger.debug('Resume file received', { index, fileName: item.name, size: item.size });
          resumeFiles.push(item);
        } else {
          logger.warn('Invalid resume item type', { index, type: typeof item });
        }
      });
    }

    // Validate file/data presence
    if (jdFiles.length === 0 && jdDataList.length === 0) {
      logger.error('No job description files or data provided');
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: 'No job descriptions provided. Provide "job_descriptions" (File), "job_description_urls" (URLs), or "job_description_data" (JSON).'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (resumeFiles.length === 0) {
      logger.error('No resume files provided');
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: 'No resume files provided. Provide either "resume_urls" (JSON) or "resumes" (FormData).'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate files
    if (jdFiles.length > 0) {
      const jdValidation = validateFiles(jdFiles);
      if (!jdValidation.valid) {
        logger.error('JD file validation failed', undefined, { validationError: jdValidation.error });
        return new Response(
          JSON.stringify({
            success: false,
            requestId,
            error: `Job description file validation failed: ${jdValidation.error}`
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    const resumeValidation = validateFiles(resumeFiles);
    if (!resumeValidation.valid) {
      logger.error('Resume file validation failed', undefined, { validationError: resumeValidation.error });
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: `Resume file validation failed: ${resumeValidation.error}`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate batch limits
    const batchValidation = validateBatchLimits(jdFiles.length + jdDataList.length, resumeFiles.length);
    if (!batchValidation.valid) {
      logger.error('Batch limit validation failed', undefined, { validationError: batchValidation.error });
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: batchValidation.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const totalCombinations = (jdFiles.length + jdDataList.length) * resumeFiles.length;
    logger.info('Starting batch processing', {
      jdFileCount: jdFiles.length,
      jdDataCount: jdDataList.length,
      resumeCount: resumeFiles.length,
      totalCombinations
    });

    // Perform the matching
    const input: MultipleMatchInput = {
      jdFiles,
      resumeFiles,
      jdUrls,
      resumeUrls,
      jdDataList
    };

    const matchResults = await matchMultipleJDsWithMultipleResumes(input, requestId);

    logger.info('Batch processing completed successfully', {
      totalMatches: matchResults.length
    });

    // Debug: Log first result structure if available
    if (matchResults.length > 0 && process.env.LOG_LEVEL === 'debug') {
      logger.debug('First match result structure', {
        hasMatchScore: matchResults[0].matchScore !== undefined,
        hasAnalysis: matchResults[0].analysis !== undefined,
        hasMatchedSkills: matchResults[0].matchedSkills !== undefined,
        matchScore: matchResults[0].matchScore,
        analysisKeys: matchResults[0].analysis ? Object.keys(matchResults[0].analysis) : []
      });
    }

    // Format the response in the expected format matching /match endpoint
    const formattedResults = matchResults.map(result => {
      const matchScore = result.matchScore || 0;
      const matchedSkills = result.matchedSkills || [];
      const unmatchedSkills = result.unmatchedSkills || [];
      const allSkills = [...matchedSkills, ...unmatchedSkills];

      return {
        Id: crypto.randomUUID(),
        "JD URL": result.jdUrl || null,
        "Resume URL": result.resumeUrl || null,
        "JD Filename": result.jdFileName,
        "Resume Filename": result.resumeFileName,
        "Resume Data": {
          "Job Title": result.jdTitle || '',
          "Matching Percentage": matchScore.toString(),
          college_name: null,
          company_names: [],
          degree: null,
          designation: null,
          email: result.analysis?.candidateEmail || '',
          experience: result.analysis?.candidateIndustrialExperienceYears || 0,
          mobile_number: result.analysis?.candidatePhone || '',
          name: result.candidateName || '',
          no_of_pages: null,
          skills: allSkills,
          certifications: result.analysis?.candidateCertifications || [],
          total_experience: result.analysis?.candidateExperience || []
        },
        "Analysis": {
          "Matching Score": matchScore,
          "Unmatched Skills": unmatchedSkills,
          "Matched Skills": matchedSkills,
          "Matched Skills Percentage": result.analysis?.skillsetMatch?.technicalSkillsMatch || 0,
          "Unmatched Skills Percentage": 100 - (result.analysis?.skillsetMatch?.technicalSkillsMatch || 0),
          "Strengths": result.strengths || [],
          "Recommendations": result.recommendations || [],
          "Required Industrial Experience": `${result.analysis?.requiredIndustrialExperienceYears || 0} years`,
          "Required Domain Experience": `${result.analysis?.requiredDomainExperienceYears || 0} years`,
          "Candidate Industrial Experience": `${result.analysis?.candidateIndustrialExperienceYears || 0} years`,
          "Candidate Domain Experience": `${result.analysis?.candidateDomainExperienceYears || 0} years`
        }
      };
    });

    const response = {
      "POST Response": formattedResults
    };

    if (matchResults.length === 0) {
      logger.warn('No matches found (possible extraction failures)', { totalCombinations });
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    logger.error('Multiple job match request failed', error instanceof Error ? error : new Error(String(error)), {
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name || typeof error
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}