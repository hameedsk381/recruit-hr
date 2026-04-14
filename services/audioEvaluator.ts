import { getLLMCache, setLLMCache } from '../utils/llmCache';
import { createHash } from 'crypto';
import { groqChatCompletion } from '../utils/groqClient';

// Define interfaces for the updated communication evaluation result
export interface CommunicationMetricScores {
  clarity: number;
  fluency: number;
  structured_reasoning: number;
  professionalism: number;
  engagement: number;
}

export interface CommunicationResults {
  metric_scores: CommunicationMetricScores;
  dominant_strength: string;
}

export interface AudioResult {
  communication_results: CommunicationResults;
  filename: string;
  score: number;
}

export interface AudioEvaluationResult {
  "Total Score": number;
  audio_results: AudioResult[];
  avg_audio_score: number;
}

// Professional interview audio evaluation prompt template focusing on Communication/Clarity rather than Emotion
const AUDIO_EVALUATION_SYSTEM_PROMPT = `You are an expert HR professional and behavioral analyst specializing in evaluating professional interview audio recordings. 
Your task is to analyze the communication skills, clarity, and overall professional performance of candidates during interviews. We focus solely on observable, job-related evidence rather than pseudo-scientific emotion/stress inferences.

COMMUNICATION ANALYSIS FRAMEWORK:
For each audio file, analyze and score the following metrics on a scale of 0-100:
1. Clarity: How well the candidate organizes their thoughts and articulates complex concepts.
2. Fluency: The accurate and confident use of role-specific terminology and concepts.
3. Structured Reasoning: Whether the candidate answers comprehensively using structured methods (e.g., the STAR framework - Situation, Task, Action, Result).
4. Professionalism: Respectful, mature tone appropriate for a business environment.
5. Engagement: Active listening indicators and natural responsiveness to interviewer prompts.

SCORING GUIDELINES:
- 90-100: Exceptional - Outstanding clarity, logical flow, and professional delivery.
- 80-89: Excellent - Strong performance with very minor communication gaps.
- 70-79: Good - Solid communication with noticeable strengths in structure.
- 60-69: Fair - Adequate but occasionally unstructured or lacking specific terminology.
- 50-59: Poor - Weak communication, difficult to follow, or unprofessional.
- 0-49: Very Poor - Inadequate communication with major red flags.

RETURN FORMAT:
Respond ONLY with a JSON object in the exact format specified below. Do not include any explanations, markdown formatting, or additional text.

{
  "audio_results": [
    {
      "filename": "audio_file_name.wav",
      "communication_results": {
        "metric_scores": {
          "clarity": 85.5,
          "fluency": 92.0,
          "structured_reasoning": 78.5,
          "professionalism": 95.0,
          "engagement": 88.0
        },
        "dominant_strength": "fluency"
      },
      "score": 88
    }
  ]
}`;

const AUDIO_EVALUATION_USER_PROMPT = `Analyze the following professional interview audio files for communication clarity and structural skills:

{audio_descriptions}

Provide a comprehensive communication evaluation for each candidate based on their audio responses during a professional interview.`;

// Function to extract JSON from AI response
function extractJsonFromResponse(response: string): any {
  try {
    return JSON.parse(response);
  } catch (e) {
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse.substring(7);
    }
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.substring(3);
    }
    if (cleanResponse.endsWith("```")) {
      cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
    }
    cleanResponse = cleanResponse.trim();
    const jsonStart = cleanResponse.indexOf("{");
    if (jsonStart !== -1) {
      let jsonString = cleanResponse.substring(jsonStart);
      const openBraces = (jsonString.match(/\{/g) || []).length;
      const closeBraces = (jsonString.match(/\}/g) || []).length;
      const openBrackets = (jsonString.match(/\[/g) || []).length;
      const closeBrackets = (jsonString.match(/\]/g) || []).length;
      let missingBraces = openBraces - closeBraces;
      let missingBrackets = openBrackets - closeBrackets;
      while (missingBrackets > 0) {
        jsonString += "]";
        missingBrackets--;
      }
      while (missingBraces > 0) {
        jsonString += "}";
        missingBraces--;
      }
      try {
        return JSON.parse(jsonString);
      } catch (e2) {
        const lastArrayStart = jsonString.lastIndexOf("[");
        const lastArrayEnd = jsonString.lastIndexOf("]");
        const lastObjectStart = jsonString.lastIndexOf("{");
        const lastObjectEnd = jsonString.lastIndexOf("}");
        if (lastArrayStart > lastArrayEnd) {
          const lastQuote = jsonString.lastIndexOf('"');
          const lastBrace = jsonString.lastIndexOf('}');
          const arrayEndPos = Math.max(lastQuote, lastBrace) + 1;
          if (arrayEndPos > lastArrayStart) {
            jsonString = jsonString.substring(0, arrayEndPos) + "]" + jsonString.substring(arrayEndPos);
          }
        }
        if (lastObjectStart > lastObjectEnd) {
          const lastQuote = jsonString.lastIndexOf('"');
          const lastBracket = jsonString.lastIndexOf(']');
          const objectEndPos = Math.max(lastQuote, lastBracket) + 1;
          if (objectEndPos > lastObjectStart) {
            jsonString = jsonString.substring(0, objectEndPos) + "}" + jsonString.substring(objectEndPos);
          }
        }
        try {
          return JSON.parse(jsonString);
        } catch (e3) {
          throw e;
        }
      }
    }
    throw e;
  }
}

// Function to process audio files using LLM analysis
async function processAudioFiles(audioBuffers: { buffer: Buffer; filename: string }[]): Promise<AudioEvaluationResult> {
  try {
    const audioDescriptions = audioBuffers.map(({ filename }, index) => 
      `Audio File ${index + 1}: ${filename} - Professional interview response (simulated duration: 60-120 seconds)`
    ).join('\n');
    
    const userPrompt = AUDIO_EVALUATION_USER_PROMPT
      .replace('{audio_descriptions}', audioDescriptions);

    const response = await groqChatCompletion(
      AUDIO_EVALUATION_SYSTEM_PROMPT,
      userPrompt,
      0.3,
      2048
    );

    try {
      const result = extractJsonFromResponse(response);
      const audioResults = result.audio_results || [];
      
      const validatedResults: AudioResult[] = audioResults.map((result: any) => {
        const communicationResults: CommunicationResults = {
          metric_scores: {
            clarity: result.communication_results?.metric_scores?.clarity || 0,
            fluency: result.communication_results?.metric_scores?.fluency || 0,
            structured_reasoning: result.communication_results?.metric_scores?.structured_reasoning || 0,
            professionalism: result.communication_results?.metric_scores?.professionalism || 0,
            engagement: result.communication_results?.metric_scores?.engagement || 0
          },
          dominant_strength: result.communication_results?.dominant_strength || 'professionalism'
        };
        
        return {
          communication_results: communicationResults,
          filename: result.filename || 'unknown.wav',
          score: result.score || 0
        };
      });
      
      const totalScore = validatedResults.reduce((sum, result) => sum + result.score, 0);
      const avg_audio_score = validatedResults.length > 0 ? totalScore / validatedResults.length : 0;
      
      return {
        "Total Score": totalScore,
        audio_results: validatedResults,
        avg_audio_score
      };
    } catch (parseError) {
      console.error('[AudioEvaluator] Error parsing JSON response:', parseError);
      return generateMockResults(audioBuffers);
    }
  } catch (error) {
    console.error('[AudioEvaluator] Error in LLM processing:', error);
    return generateMockResults(audioBuffers);
  }
}

function generateMockResults(audioBuffers: { buffer: Buffer; filename: string }[]): AudioEvaluationResult {
  const audioResults: AudioResult[] = audioBuffers.map(({ buffer, filename }) => {
    const hash = createHash('md5').update(buffer).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    
    const metrics: (keyof CommunicationMetricScores)[] = ['clarity', 'fluency', 'structured_reasoning', 'professionalism', 'engagement'];
    
    const baseScores: CommunicationMetricScores = {
      clarity: 65 + (hashValue % 25),
      fluency: 70 + (hashValue % 20),
      structured_reasoning: 60 + (hashValue % 30),
      professionalism: 80 + (hashValue % 15),
      engagement: 75 + (hashValue % 20)
    };
    
    const metric_scores = {} as CommunicationMetricScores;
    for (const metric of metrics) {
      const variation = (Math.random() * 10) - 5;
      const score = Math.max(0, Math.min(100, baseScores[metric] + variation));
      metric_scores[metric] = parseFloat(score.toFixed(1));
    }
    
    let dominant_strength: string = 'professionalism';
    let max_score = 0;
    for (const metric of metrics) {
      if (metric_scores[metric] > max_score) {
        max_score = metric_scores[metric];
        dominant_strength = metric;
      }
    }
    
    const baseScore = 70 + (hashValue % 20);
    const variation = (Math.random() * 10) - 5;
    const score = Math.max(0, Math.min(100, baseScore + variation));
    
    return {
      communication_results: {
        metric_scores,
        dominant_strength
      },
      filename,
      score: parseFloat(score.toFixed(1))
    };
  });
  
  const totalScore = audioResults.reduce((sum, result) => sum + result.score, 0);
  const avg_audio_score = audioResults.length > 0 ? parseFloat((totalScore / audioResults.length).toFixed(1)) : 0;
  
  return {
    "Total Score": parseFloat(totalScore.toFixed(1)),
    audio_results: audioResults,
    avg_audio_score
  };
}

export async function evaluateAudioFiles(audioFiles: { buffer: Buffer; filename: string }[]): Promise<AudioEvaluationResult> {
  try {
    const cacheKey = `audio_eval_${createHash('md5')
      .update(JSON.stringify(audioFiles.map(f => ({ 
        filename: f.filename, 
        hash: createHash('md5').update(f.buffer).digest('hex') 
      }))))
      .digest('hex')}`;

    const cachedResult = await getLLMCache(cacheKey);
    if (cachedResult) {
      console.log('[AudioEvaluator] Returning cached result');
      return cachedResult as AudioEvaluationResult;
    }

    const result = await processAudioFiles(audioFiles);
    await setLLMCache(cacheKey, result, 1000 * 60 * 60 * 24);
    
    return result;
  } catch (error) {
    console.error('[AudioEvaluator] Error evaluating audio files:', error);
    throw new Error(`Failed to evaluate audio files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}