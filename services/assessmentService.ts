import { groqChatCompletion } from '../utils/groqClient';
import { JobDescriptionData } from './jdExtractor';
import { ResumeData } from './resumeExtractor';
import { getLLMCache, setLLMCache } from '../utils/llmCache';
import { createHash } from 'crypto';
import { getMongoDb } from '../utils/mongoClient';

export interface AssessmentProblem {
  id: string;
  type: 'coding' | 'scenario' | 'design';
  title: string;
  description: string;
  constraints: string[];
  starterCode?: string;
  expectedOutput?: string;
  rubric: string[];
}

const ASSESSMENT_PROMPT = `You are a Senior Hiring Manager and Industry Expert.
Based on the Job Description, generate a high-stakes interactive assessment problem.
- If the role is Technical (Engineering, Software, Medical, etc.), generate a problem-solving or technical diagnostic task.
- If it's Creative, generate a design or strategy prompt.
- If it's Managerial/Operational, generate a complex situational judgment scenario.

The problem should be challenging and difficult to solve using simple LLM prompts (add unique, industry-specific constraints).

Return ONLY a JSON object:
{
  "title": "Problem Title",
  "type": "technical | creative | scenario",
  "description": "Detailed markdown description of the problem/task",
  "constraints": ["Constraint 1", "Constraint 2"],
  "starterCode": "Optional starter content, code, or template",
  "rubric": ["What to look for in a good answer", "Red flags"]
}`;

export class AssessmentService {
  static async generateDynamicProblem(
    job: JobDescriptionData,
    candidate: ResumeData
  ): Promise<AssessmentProblem> {
    const cacheKey = `dynamic_assessment_${createHash('md5').update(job.title + candidate.name).digest('hex')}`;
    const cached = await getLLMCache(cacheKey);
    if (cached) return cached as AssessmentProblem;

    const context = `Job: ${job.title} at ${job.company}. Skills: ${job.skills.join(', ')}. Candidate: ${candidate.name}. Experience: ${candidate.experience.join('\n')}`;
    
    const response = await groqChatCompletion(
      "You are an elite interviewer.",
      `${ASSESSMENT_PROMPT}\n\nContext:\n${context}`,
      0.8,
      1500
    );

    try {
      const result = JSON.parse(response.replace(/```json|```/g, ''));
      const problem = { ...result, id: crypto.randomUUID() };
      
      // Persist to DB
      await this.saveProblem(problem);
      
      await setLLMCache(cacheKey, problem, 1000 * 60 * 60 * 12);
      return problem;
    } catch (e) {
      console.error("[AssessmentService] Generation Failed", e);
      throw e;
    }
  }

  static async saveProblem(problem: AssessmentProblem): Promise<void> {
    const db = await getMongoDb();
    if (db) {
      await db.collection('assessment_problems').updateOne(
        { id: problem.id },
        { $set: { ...problem, updatedAt: new Date() } },
        { upsert: true }
      );
    }
  }

  static async getProblemById(id: string): Promise<AssessmentProblem | null> {
    const db = await getMongoDb();
    if (!db) return null;
    const problem = await db.collection('assessment_problems').findOne({ id });
    return problem as AssessmentProblem | null;
  }

  static async gradeSubmission(
    problem: AssessmentProblem,
    submission: string
  ): Promise<{ score: number; feedback: string }> {
    const prompt = `Grade this candidate submission for the following problem:
    Problem: ${problem.title}
    Description: ${problem.description}
    Rubric: ${problem.rubric.join(', ')}
    
    Candidate Submission:
    ${submission}
    
    Return ONLY a JSON object:
    {
      "score": 0-100,
      "feedback": "Detailed feedback on logic, efficiency, and edge cases."
    }`;

    const response = await groqChatCompletion(
      "You are a strict and fair expert grader.",
      prompt,
      0.2,
      1000
    );

    return JSON.parse(response.replace(/```json|```/g, ''));
  }
}
