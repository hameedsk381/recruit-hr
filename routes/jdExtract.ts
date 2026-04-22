import { extractJobDescriptionData } from '../services/jdExtractor';

export async function jdExtractHandler(req: Request): Promise<Response> {
  try {
    // Check if the request has the correct content type for form data
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid content type. Expected multipart/form-data'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('[JDExtractHandler] Form data parsing error:', formError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse form data. Ensure the request is sent with Content-Type: multipart/form-data',
          details: formError instanceof Error ? formError.message : 'Unknown form parsing error'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const file = formData.get('jobDescription');
    
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
    
    const buffer = await file.arrayBuffer();
    const jdData = await extractJobDescriptionData(Buffer.from(buffer));
    
    // Cross-verify with heuristic validator to prevent LLM bypass
    const { validateJobDescription } = await import('../services/jdValidator');
    const validation = validateJobDescription(jdData);
    
    console.log(`[JDExtractHandler] Validation: type=${validation.documentType}, score=${validation.suitabilityScore}, isValid=${validation.isValid}`);
    
    if (validation.documentType === 'resume') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'DOCUMENT_IS_RESUME',
          message: 'The uploaded document appears to be a candidate resume, not a job description.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: jdData 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[JDExtractHandler] Error:', error);
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