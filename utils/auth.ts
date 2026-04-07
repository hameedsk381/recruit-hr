import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';
const JWT_EXPIRES_IN = '24h';

export interface UserPayload {
    userId: string;
    tenantId: string;
    email: string;
    roles: string[];
}

/**
 * Generates a signed JWT for a user
 */
export function generateToken(payload: UserPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies and decodes a JWT. Throws if invalid.
 */
export function verifyToken(token: string): UserPayload {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
}
