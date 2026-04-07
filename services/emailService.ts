import { Interview } from '../types/interview';

export class EmailService {
    /**
     * Send an interview invitation email to the candidate and recruiter
     */
    static async sendInterviewInvite(interview: Interview) {
        // In a real production app, we would use a service like SendGrid, Postmark, or AWS SES.
        // For this demo, we'll log the email content.

        const startTime = new Date(interview.startTime);
        const dateStr = startTime.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const emailContent = {
            to: interview.candidateEmail,
            subject: `Interview Invitation: ${interview.jobTitle} with TalentAcquisition.ai`,
            body: `
                Hi ${interview.candidateName},

                We are excited to invite you to an interview for the ${interview.jobTitle} position!

                Details:
                - Date: ${dateStr}
                - Time: ${timeStr}
                - Duration: 1 Hour
                - Meeting Link: ${interview.meetingLink}

                Focus Areas for this round:
                ${interview.focusAreas?.map(fa => `- ${fa.topic}: ${fa.why}`).join('\n') || 'General Technical Review'}

                We've also added a sample question for you to think about:
                "${interview.focusAreas?.[0]?.sample_probe_question || 'Walk us through your most challenging project.'}"

                Looking forward to seeing you!
                
                Best regards,
                The TalentAcquisition.ai Team
            `
        };

        console.log(`[EmailService] SENDING EMAIL TO: ${emailContent.to}`);
        console.log(`[EmailService] SUBJECT: ${emailContent.subject}`);
        console.log(`[EmailService] BODY: ${emailContent.body}`);

        return { success: true, messageId: `msg_${crypto.randomUUID()}` };
    }

    /**
     * Send an interview cancellation email
     */
    static async sendCancellationEmail(interview: Interview) {
        console.log(`[EmailService] SENDING CANCELLATION EMAIL TO: ${interview.candidateEmail}`);
        return { success: true };
    }

    /**
     * Send a reminder email with a prep guide
     */
    static async sendInterviewReminder(interview: Interview) {
        const startTime = new Date(interview.startTime);
        const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const emailContent = {
            to: interview.candidateEmail,
            subject: `Reminder: Your interview for ${interview.jobTitle} starts in 1 hour`,
            body: `
                Hi ${interview.candidateName},

                This is a friendly reminder that your interview for the ${interview.jobTitle} position starts in 1 hour at ${timeStr}.

                PREP GUIDE:
                1. Test your video/audio at: ${interview.meetingLink}
                2. Be ready to discuss the following areas:
                   ${interview.focusAreas?.map(fa => `- ${fa.topic}`).join('\n') || '- Technical foundations'}
                3. Pro-tip: ${interview.focusAreas?.[0]?.sample_probe_question ? `Prepare to answer: "${interview.focusAreas[0].sample_probe_question}"` : 'Be prepared to walk through your recent projects.'}

                See you soon!
                
                Best regards,
                TalentAcquisition.ai Team
            `
        };

        console.log(`[EmailService] SENDING REMINDER TO: ${emailContent.to}`);
        console.log(`[EmailService] SUBJECT: ${emailContent.subject}`);

        return { success: true, messageId: `rem_${crypto.randomUUID()}` };
    }
}
