import { extractJobDescriptionData, transformToJobDescriptionResponse } from '../services/jdExtractor';
import { JobDescriptionResponse } from '../services/jdExtractor';

// Helper function to create SSE formatted messages
function formatSSE(data: any, event?: string): string {
  let message = '';
  if (event) {
    message += `event: ${event}\n`;
  }
  message += `data: ${JSON.stringify(data)}\n\n`;
  return message;
}

export async function jdExtractorStreamingHandler(req: Request): Promise<Response> {
  // Check if the request has the correct content type for form data
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return new Response(
      formatSSE({ 
        success: false, 
        error: 'Invalid content type. Expected multipart/form-data'
      }, 'error'),
      {
        status: 400,
        headers: { 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    );
  }

  try {
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('job_description');
    
    if (!file) {
      return new Response(
        formatSSE({ 
          success: false, 
          error: 'No job description file provided' 
        }, 'error'),
        {
          status: 400,
          headers: { 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }

    if (!(file instanceof File)) {
      return new Response(
        formatSSE({ 
          success: false, 
          error: 'Invalid file provided. Expected a File object' 
        }, 'error'),
        {
          status: 400,
          headers: { 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }
    
    // Send initial processing event
    const initStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(new TextEncoder().encode(formatSSE({ 
            status: 'processing', 
            message: 'Starting job description extraction...'
          }, 'status')));
          
          // Process the file
          const buffer = await file.arrayBuffer();
          
          controller.enqueue(new TextEncoder().encode(formatSSE({ 
            status: 'processing', 
            message: 'File uploaded successfully. Extracting text...'
          }, 'status')));
          
          // Extract job description data
          const jdData = await extractJobDescriptionData(Buffer.from(buffer));
          
          // Cross-verify with heuristic validator to prevent LLM bypass
          const { validateJobDescription } = await import('../services/jdValidator');
          const validation = validateJobDescription(jdData);
          
          if (validation.documentType === 'resume') {
            controller.enqueue(new TextEncoder().encode(formatSSE({ 
              success: false, 
              error: 'DOCUMENT_IS_RESUME',
              message: 'The uploaded document appears to be a candidate resume, not a job description.'
            }, 'error')));
            controller.close();
            return;
          }
          
          controller.enqueue(new TextEncoder().encode(formatSSE({ 
            status: 'processing', 
            message: 'Text extracted. Analyzing with AI...'
          }, 'status')));
          
          // Transform the data to match the new response format
          const transformedData: JobDescriptionResponse = transformToJobDescriptionResponse(jdData);
          
          // Send success event with data
          controller.enqueue(new TextEncoder().encode(formatSSE({ 
            success: true, 
            data: transformedData
          }, 'result')));
          
          // Send completion event
          controller.enqueue(new TextEncoder().encode(formatSSE({ 
            status: 'completed', 
            message: 'Job description extraction completed successfully'
          }, 'status')));
          
          controller.close();
        } catch (error) {
          console.error('[JDExtractorStreamingHandler] Error:', error);
          controller.enqueue(new TextEncoder().encode(formatSSE({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, 'error')));
          controller.close();
        }
      }
    });
    
    return new Response(initStream, {
      status: 200,
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (formError) {
    console.error('[JDExtractorStreamingHandler] Form data parsing error:', formError);
    return new Response(
      formatSSE({ 
        success: false, 
        error: 'Failed to parse form data. Ensure the request is sent with Content-Type: multipart/form-data',
        details: formError instanceof Error ? formError.message : 'Unknown form parsing error'
      }, 'error'),
      {
        status: 400,
        headers: { 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    );
  }
}