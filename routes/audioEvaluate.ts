import { evaluateAudioFiles } from '../services/audioEvaluator';
import { AuthContext } from '../middleware/authMiddleware';

export async function audioEvaluateHandler(req: Request, context: AuthContext): Promise<Response> {
  try {
    // Check if the content type is multipart/form-data
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Content-Type must be multipart/form-data' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    
    // Get all audio files with key 'audios'
    const audioFiles = formData.getAll('audios') as unknown[];
    
    // Validate that we have audio files
    if (!audioFiles || audioFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No audio files provided (expected key: audios)' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Validate that all entries are files
    for (const audioFile of audioFiles) {
      if (!(audioFile instanceof File)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid audio file provided (expected File objects)' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
            }
        );
      }
    }
    
    // Convert File objects to buffers
    const audioBuffers = await Promise.all(
      audioFiles.map(async (audioFile) => {
        const file = audioFile as File;
        const buffer = await file.arrayBuffer();
        return {
          buffer: Buffer.from(buffer),
          filename: file.name
        };
      })
    );
    
    // Evaluate the audio files
    const evaluationResult = await evaluateAudioFiles(audioBuffers);
    
    return new Response(
      JSON.stringify(evaluationResult),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[AudioEvaluateHandler] Error:', error);
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