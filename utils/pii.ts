/**
 * PII Manager to protect sensitive candidate data before sending to LLMs.
 */
export class PIIManager {
    /**
     * Masks PII data in a string or object.
     * Simple implementation: Masks common patterns.
     */
    static maskString(text: string): string {
        if (!text) return text;

        let masked = text;

        // Mask Emails
        masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_HIDDEN]');

        // Mask Phone Numbers (Basic pattern for global formats)
        masked = masked.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_HIDDEN]');
        
        // Mask SSN
        masked = masked.replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '[SSN_HIDDEN]');

        return masked;
    }

    /**
     * Checks if a string contains obvious PII like email, phone, SSN
     */
    static containsPII(text: string): boolean {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
        const ssnRegex = /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/;
        
        return emailRegex.test(text) || phoneRegex.test(text) || ssnRegex.test(text);
    }

    /**
     * Advanced: Create a specific mask for a candidate to allow "re-hydration"
     * if the LLM needs to reference them by a temporary ID.
     */
    static maskCandidateProfile(profile: any): any {
        const maskedProfile = { ...profile };

        if (maskedProfile.name) {
            maskedProfile.name = 'Candidate_' + Math.random().toString(36).substring(2, 7).toUpperCase();
        }

        if (maskedProfile.email) {
            maskedProfile.email = '[REDACTED]';
        }

        if (maskedProfile.phone) {
            maskedProfile.phone = '[REDACTED]';
        }

        if (maskedProfile.address) {
            maskedProfile.address = '[REDACTED_ADDRESS]';
        }

        return maskedProfile;
    }

    /**
     * Clean a document text of most obvious PII before sending for heavy processing.
     */
    static scrubDocumentText(text: string): string {
        return this.maskString(text);
    }
}
