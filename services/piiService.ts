import { ROLES } from "../utils/permissions";

export class PiiService {
    
    /**
     * Anonymizes or masks PII data based on user roles.
     * Admins see everything, Recruiters see everything, 
     * but Interviewers or external reviewers see masked emails/phones.
     */
    static scrubCandidate(candidate: any, roles: string[]) {
        if (roles.includes(ROLES.ADMIN) || roles.includes(ROLES.RECRUITER)) {
            return candidate;
        }

        const scrubbed = { ...candidate };

        if (scrubbed.email) {
            scrubbed.email = this.maskEmail(scrubbed.email);
        }
        if (scrubbed.phone) {
            scrubbed.phone = '***-***-' + scrubbed.phone.slice(-4);
        }
        
        // Hide sensitive fields like current salary if present
        delete scrubbed.expectedSalary;
        delete scrubbed.currentSalary;

        return scrubbed;
    }

    private static maskEmail(email: string) {
        const [user, domain] = email.split('@');
        return user.slice(0, 2) + '*'.repeat(user.length - 2) + '@' + domain;
    }
}
