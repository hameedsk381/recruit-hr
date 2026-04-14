import { Interview } from '../types/interview';
import { Resend } from 'resend';

// Initialize Resend with API Key from environment
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'interviews@talentacquisition.ai';

export class EmailService {
    /**
     * Send an interview invitation email to the candidate and recruiter
     */
    static async sendInterviewInvite(interview: Interview) {
        const startTime = new Date(interview.startTime);
        const dateStr = startTime.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const subject = `Interview Invitation: ${interview.jobTitle} with TalentAcquisition.ai`;
        const focusAreasList = interview.focusAreas?.map(fa => `<li><strong>${fa.topic}</strong>: ${fa.why}</li>`).join('') || '<li>General Technical Review</li>';
        const sampleQuestion = interview.focusAreas?.[0]?.sample_probe_question || 'Walk us through your most challenging project.';

        const html = `
            <p>Hi ${interview.candidateName},</p>
            <p>We are excited to invite you to an interview for the <strong>${interview.jobTitle}</strong> position!</p>
            <p><strong>Details:</strong><br/>
            - Date: ${dateStr}<br/>
            - Time: ${timeStr}<br/>
            - Duration: 1 Hour<br/>
            - Meeting Link: <a href="${interview.meetingLink}">${interview.meetingLink}</a></p>
            <p><strong>Focus Areas for this round:</strong></p>
            <ul>${focusAreasList}</ul>
            <p>We've also added a sample question for you to think about:<br/>
            <em>"${sampleQuestion}"</em></p>
            <p>Looking forward to seeing you!</p>
            <p>Best regards,<br/>The TalentAcquisition.ai Team</p>
        `;

        // If no API Key inside production, fallback to mock logs gracefully
        if (!process.env.RESEND_API_KEY) {
            console.log(`[EmailService MOCK] SENDING INVITE TO: ${interview.candidateEmail}`);
            return { success: true, messageId: `msg_${crypto.randomUUID()}` };
        }

        try {
            const data = await resend.emails.send({
                from: `TalentAcquisition.ai <${fromEmail}>`,
                to: [interview.candidateEmail],
                subject: subject,
                html: html
            });
            return { success: true, messageId: data.data?.id };
        } catch (error) {
            console.error('[EmailService] Resend API Error on Invite:', error);
            return { success: false, error };
        }
    }

    /**
     * Send an interview cancellation email
     */
    static async sendCancellationEmail(interview: Interview) {
        const html = `
            <p>Hi ${interview.candidateName},</p>
            <p>This is to confirm that your interview for the <strong>${interview.jobTitle}</strong> position has been cancelled.</p>
            <p>If you need to reschedule or have any questions, please reply to this email.</p>
            <p>Best regards,<br/>The TalentAcquisition.ai Team</p>
        `;

        if (!process.env.RESEND_API_KEY) {
            console.log(`[EmailService MOCK] SENDING CANCELLATION EMAIL TO: ${interview.candidateEmail}`);
            return { success: true };
        }

        try {
            await resend.emails.send({
                from: `TalentAcquisition.ai <${fromEmail}>`,
                to: [interview.candidateEmail],
                subject: `Interview Cancelled: ${interview.jobTitle}`,
                html: html
            });
            return { success: true };
        } catch (error) {
            console.error('[EmailService] Resend API Error on Cancel:', error);
            return { success: false, error };
        }
    }

    /**
     * Send a reminder email with a prep guide
     */
    static async sendInterviewReminder(interview: Interview) {
        const startTime = new Date(interview.startTime);
        const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const html = `
            <p>Hi ${interview.candidateName},</p>
            <p>This is a friendly reminder that your interview for the <strong>${interview.jobTitle}</strong> position starts in 1 hour at ${timeStr}.</p>
            <p><strong>PREP GUIDE:</strong></p>
            <ol>
                <li>Test your video/audio at: <a href="${interview.meetingLink}">${interview.meetingLink}</a></li>
                <li>Be ready to discuss the following areas:
                    <ul>${interview.focusAreas?.map(fa => `<li>${fa.topic}</li>`).join('') || '<li>Technical foundations</li>'}</ul>
                </li>
                <li>Pro-tip: <em>${interview.focusAreas?.[0]?.sample_probe_question ? `Prepare to answer: "${interview.focusAreas[0].sample_probe_question}"` : 'Be prepared to walk through your recent projects.'}</em></li>
            </ol>
            <p>See you soon!</p>
            <p>Best regards,<br/>TalentAcquisition.ai Team</p>
        `;

        if (!process.env.RESEND_API_KEY) {
            console.log(`[EmailService MOCK] SENDING REMINDER TO: ${interview.candidateEmail}`);
            return { success: true, messageId: `rem_${crypto.randomUUID()}` };
        }

        try {
            const data = await resend.emails.send({
                from: `TalentAcquisition.ai <${fromEmail}>`,
                to: [interview.candidateEmail],
                subject: `Reminder: Your interview for ${interview.jobTitle} starts in 1 hour`,
                html: html
            });
            return { success: true, messageId: data.data?.id };
        } catch (error) {
            console.error('[EmailService] Resend API Error on Reminder:', error);
            return { success: false, error };
        }
    }
}
