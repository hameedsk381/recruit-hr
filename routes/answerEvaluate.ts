import { evaluateAnswer, type EvaluationInput, type EvaluationScores } from '../services/answerEvaluator';
import { AuthContext } from '../middleware/authMiddleware';

export async function answerEvaluateHandler(req: Request, context: AuthContext): Promise<Response> {
  try {
    // Check if the content type is JSON
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Content-Type must be application/json' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the JSON body
    const body = await req.json() as EvaluationInput;
    
    // Validate required fields
    if (!body.question || !body.answer) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Both "question" and "answer" fields are required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Evaluate the answer
    const evaluationScores: EvaluationScores = await evaluateAnswer(body);
    
    // Return just the evaluation scores object directly
    return new Response(
      JSON.stringify(evaluationScores),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[AnswerEvaluateHandler] Error:', error);
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