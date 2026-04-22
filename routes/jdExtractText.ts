import { extractJobDescriptionDataFromText } from '../services/jdExtractor';

export async function jdExtractTextHandler(req: Request): Promise<Response> {
  try {
    const { text } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: 'No text provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const jdData = await extractJobDescriptionDataFromText(text);
    
    // Cross-verify with heuristic validator to prevent LLM bypass
    const { validateJobDescription } = await import('../services/jdValidator');
    const validation = validateJobDescription(jdData);
    
    if (validation.documentType === 'resume') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'DOCUMENT_IS_RESUME',
          message: 'The provided text appears to be a candidate resume, not a job description.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: jdData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[JDExtractTextHandler] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
