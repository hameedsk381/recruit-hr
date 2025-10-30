import { extractJobDescriptionData } from '../services/jdExtractor';
import { validateJobDescription, generateValidationReport } from '../services/jdValidator';
import { downloadFileFromUrl, isValidUrl } from '../utils/fileDownloader';

export async function jdValidateHandler(req: Request): Promise<Response> {
  try {
    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer;
    
    // Check if request is JSON (URL-based input)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const jdUrl = body.job_description_url || body.jd_url;
      
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
      
      // Validate URL
      if (!isValidUrl(jdUrl)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid URL format. URL must start with http:// or https://' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Download file from URL
      try {
        const file = await downloadFileFromUrl(jdUrl);
        buffer = Buffer.from(await file.arrayBuffer());
      } catch (downloadError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to download file from URL',
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
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch (formError) {
        console.error('[JDValidateHandler] Form data parsing error:', formError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse form data',
            details: formError instanceof Error ? formError.message : 'Unknown form parsing error'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const file = formData.get('job_description');
      
      if (!file) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No job description file provided' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (!(file instanceof File)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid file provided. Expected a File object' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      buffer = Buffer.from(await file.arrayBuffer());
    }
    // Invalid content type
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid content type. Expected application/json (for URL) or multipart/form-data (for file upload)'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Extract JD data from buffer
    const jdData = await extractJobDescriptionData(buffer);
    
    // Validate the job description
    const validationResult = validateJobDescription(jdData);
    
    // Generate detailed report
    const detailedReport = generateValidationReport(jdData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          validation: validationResult,
          extractedData: {
            title: jdData.title,
            company: jdData.company,
            skillsCount: jdData.skills?.length || 0,
            requirementsCount: jdData.requirements?.length || 0
          },
          detailedReport
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[JDValidateHandler] Error:', error);
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