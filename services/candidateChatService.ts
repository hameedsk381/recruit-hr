import { autoRoutedChatCompletion } from "./llmRouter";
import { getMongoDb } from "../utils/mongoClient";
import { ObjectId } from "mongodb";

const EVALUATOR_SYSTEM_PROMPT = `You are the "Technical Evaluator" for Reckuit.ai.
Your goal is to conduct a brief, 3-5 question pre-screening interview with a candidate who has just applied.

PERSONA:
- Professional, rigorous, and technically curious.
- You are an expert in the candidate's field (based on the Job Description).
- You do not offer praise; you look for evidence of claims.

RULES:
1. FOCUS: Ask questions only about the technical focus areas and mandatory skills in the Job Description.
2. EVIDENCE: If a candidate makes a claim, ask for a brief specific example of how they applied that skill.
3. CONCISION: Keep your responses short. One question at a time.
4. THRESHOLD: After 5 questions, or if the candidate seems ready to finish, provide a friendly closing.
5. NO JUDGMENT: Do not tell the candidate if they are a "good fit". Just gather data for the human recruiter.

The recruiter will see your transcript. Make sure to probe for depth on critical skills.`;

export class CandidateChatService {
    /**
     * Continue a conversation with a candidate
     */
    static async handleChatMessage(params: {
        applicationId: string;
        tenantId: string;
        message: string;
    }): Promise<{ response: string; isFinished: boolean }> {
        const { applicationId, tenantId, message } = params;
        const db = getMongoDb();
        if (!db) throw new Error("DB Unavailable");

        // 1. Fetch Application & Job Context
        const application = await db.collection('applications').findOne({ _id: new ObjectId(applicationId), tenantId });
        if (!application) throw new Error("Application not found");

        const job = await db.collection('jobs').findOne({ _id: new ObjectId(application.jobId), tenantId });
        
        // 2. Fetch/Initialize Chat History
        const chatDoc = await db.collection('candidate_chats').findOne({ applicationId: new ObjectId(applicationId) });
        const history = chatDoc?.messages || [];
        
        // Add user message to history
        history.push({ role: "user", content: message, timestamp: new Date() });

        // 3. Construct Context-Aware Prompt
        const jobContext = `
JOB TITLE: ${job?.title}
MANDATORY SKILLS: ${job?.skills?.join(', ')}
Key Responsibilities: ${job?.responsibilities?.slice(0, 3).join('; ')}
`;

        const userContext = `
CANDIDATE NAME: ${application.name}
RESUME SUMMARY: Verified technical claims in resume: ${application.resumeName}
`;

        const fullPrompt = `CONTEXT:\n${jobContext}\n${userContext}\n\nHISTORY:\n${history.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\n\nEvaluator:`;

        // 4. Generate AI Response
        const response = await autoRoutedChatCompletion(
            EVALUATOR_SYSTEM_PROMPT,
            fullPrompt,
            { temperature: 0.5, max_tokens: 512, containsPII: true }
        );

        // 5. Check if finished (simple heuristic for now)
        const isFinished = history.length >= 10 || response.toLowerCase().includes("thank you for your time");

        // 6. Update Chat History
        history.push({ role: "assistant", content: response, timestamp: new Date() });
        await db.collection('candidate_chats').updateOne(
            { applicationId: new ObjectId(applicationId) },
            { 
                $set: { 
                    messages: history, 
                    lastUpdated: new Date(),
                    isComplete: isFinished
                } 
            },
            { upsert: true }
        );

        // 7. If finished, trigger a summary for the recruiter (Optional/Async)
        if (isFinished) {
            await this.summarizeChatForRecruiter(applicationId, tenantId, history);
        }

        return { response, isFinished };
    }

    private static async summarizeChatForRecruiter(applicationId: string, tenantId: string, history: any[]) {
        const db = getMongoDb();
        if (!db) return;

        const summaryPrompt = `Summarize this pre-screening chat transcript for a recruiter. 
        Highlight:
        1. Confirmed technical strengths
        2. Areas where the candidate was vague
        3. Culture/Communication signals
        
        Transcript:
        ${history.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

        const summary = await autoRoutedChatCompletion(
            "You are a talent analyst summarizing a screening interview.",
            summaryPrompt,
            { temperature: 0.3, max_tokens: 1024 }
        );

        await db.collection('applications').updateOne(
            { _id: new ObjectId(applicationId), tenantId },
            { $set: { screeningSummary: summary, status: "screened" } }
        );
    }
}
