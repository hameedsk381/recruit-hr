import { generateMCQQuestions } from '../services/mcqGenerator';
import { extractJobDescriptionData } from '../services/jdExtractor';
import { extractResumeData } from '../services/resumeExtractor';
import { downloadFileFromUrl, isValidUrl } from '../utils/fileDownloader';
import { AuthContext } from '../middleware/authMiddleware';

export async function mcqGenerateHandler(req: Request, context: AuthContext): Promise<Response> {
  try {
    const contentType = req.headers.get('content-type') || '';
    let jdBuffer: Buffer;
    let resumeBuffer: Buffer;
    
    // Check if request is JSON (URL-based input)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const jdUrl = body.job_description_url || body.jd_url;
      const resumeUrl = body.resume_url;
      
      if (!jdUrl) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No job description URL provided. Expected field: job_description_url or jd_url' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (!resumeUrl) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No resume URL provided. Expected field: resume_url' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Validate URLs
      if (!isValidUrl(jdUrl)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid job description URL format. URL must start with http:// or https://' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (!isValidUrl(resumeUrl)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid resume URL format. URL must start with http:// or https://' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Download files from URLs
      try {
        const jdFile = await downloadFileFromUrl(jdUrl);
        jdBuffer = Buffer.from(await jdFile.arrayBuffer());
      } catch (downloadError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to download job description from URL',
            details: downloadError instanceof Error ? downloadError.message : String(downloadError)
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      try {
        const resumeFile = await downloadFileFromUrl(resumeUrl);
        resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
      } catch (downloadError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to download resume from URL',
            details: downloadError instanceof Error ? downloadError.message : String(downloadError)
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    // Handle multipart/form-data (file upload)
    else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      // Prefer new keys: job_description and resumes (fallback to legacy keys)
      const jdFile = (formData.get('job_description') || formData.get('jobDescription')) as unknown;
      
      // Use 'resumes' for single or multiple; take the first file if multiple
      let resumeFile: File | null = null;
      const resumesList = formData.getAll('resumes');
      if (resumesList && resumesList.length > 0) {
        const first = resumesList.find((i) => i instanceof File);
        if (first && first instanceof File) {
          resumeFile = first;
        }
      }
      // Backward compatibility: fall back to 'resume'
      if (!resumeFile) {
        const legacy = formData.getAll('resume');
        const firstLegacy = legacy.find((i) => i instanceof File);
        if (firstLegacy && firstLegacy instanceof File) {
          resumeFile = firstLegacy;
        }
      }
      
      if (!jdFile || !(jdFile instanceof File)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No job description file provided or invalid file (expected key: job_description)' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (!resumeFile || !(resumeFile instanceof File)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No resume file provided or invalid file (expected key: resumes)' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Extract data from both files
      jdBuffer = Buffer.from(await jdFile.arrayBuffer());
      resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
    }
    // Invalid content type
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid content type. Expected application/json (for URLs) or multipart/form-data (for file upload)'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Extract data from buffers
    const jdData = await extractJobDescriptionData(jdBuffer);
    const resumeData = await extractResumeData(resumeBuffer, context.tenantId);
    
    // Generate MCQ questions
    const questions = await generateMCQQuestions(jdData, resumeData);
    
    // Transform to required response shape
    const transformedQuestions = (questions || []).map(q => ({
      question: q.question,
      options: q.options,
      answer: (q as any).answer ?? q.correctAnswer,
      explanation: q.explanation // Include the explanation field
    }));
    
    const payload = {
      "POST Response": [
        {
          Id: crypto.randomUUID(),
          "MCQ with answers": {
            questions: transformedQuestions
          }
        }
      ]
    };
    
    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[MCQGenerateHandler] Error:', error);
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