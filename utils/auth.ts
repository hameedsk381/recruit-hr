import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';
const JWT_EXPIRES_IN = '24h';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-key-change-me')) {
    throw new Error('JWT_SECRET must be set to a non-default value in production');
}

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
