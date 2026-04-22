import { groqChatCompletion } from '../../utils/groqClient';

export class OutreachService {
    async draftEmail(jobContext: any, candidateProfile: any, assessment: any, type: 'invite' | 'reject' | 'nurture') {
        const prompt = `
You are an expert Talent Acquisition Copilot.
Your task is to draft a personalized ${type} email to a candidate based on their AI evaluation.

Job Context:
Title: ${jobContext.title}
Company: ${jobContext.company || 'Our Company'}

Candidate Profile:
Name: ${candidateProfile.name}
Extracted Skills: ${candidateProfile.extracted_skills?.join(', ') || 'N/A'}

AI Assessment:
Overall Fit: ${assessment.fit_assessment?.overall_fit || 'N/A'}
Strengths: ${assessment.strengths?.map((s: any) => s.skill).join(', ') || 'N/A'}
Gaps: ${assessment.gaps_and_risks?.map((g: any) => g.area).join(', ') || 'None'}

Instructions:
1. Write a professional, warm, and highly personalized email.
2. If type is 'invite', congratulate them on their strong background in [Strengths] and invite them to a 30-minute introductory call.
3. If type is 'reject', thank them but kindly state that we are looking for more experience in [Gaps].
4. If type is 'nurture', let them know their profile is impressive but we don't have an immediate fit, but will keep them in mind for future roles requiring [Strengths].
5. Keep it concise (under 150 words).
6. Return ONLY the email subject and body in the following JSON format:
{
  "subject": "Email Subject Here",
  "body": "Email Body Here (can include line breaks \n)"
}
`;

        const response = await groqChatCompletion(
            "You are an expert Talent Acquisition Copilot.",
            prompt,
            0.5,
            1024,
            { type: "json_object" }
        );

        try {
            return JSON.parse(response);
        } catch (e) {
            console.error("Failed to parse outreach response:", response);
            return {
                subject: "Update on your application",
                body: response
            };
        }
    }
}

export const outreachService = new OutreachService();
