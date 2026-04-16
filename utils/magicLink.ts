import { sign, verify } from "jsonwebtoken";

const CANDIDATE_SECRET = process.env.CANDIDATE_SECRET || "magic_token_secondary_secret";

export interface CandidateTokenPayload {
    email: string;
    candidateId: string;
    tenantId: string;
    jobId: string;
    type: "MAGIC_LINK";
}

/**
 * Generate a long-lived JWT for candidate status tracking
 */
export function generateMagicLinkToken(payload: CandidateTokenPayload): string {
    return sign(payload, CANDIDATE_SECRET, { expiresIn: "60d" });
}

/**
 * Verify a magic link token
 */
export function verifyMagicLinkToken(token: string): CandidateTokenPayload | null {
    try {
        return verify(token, CANDIDATE_SECRET) as CandidateTokenPayload;
    } catch (error) {
        return null;
    }
}
