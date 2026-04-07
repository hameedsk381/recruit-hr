import { initializeRequestContext } from '../utils/requestContext';
import { AuditService } from '../services/auditService';
import { verifyToken } from '../utils/auth';

export interface AuthContext {
    isAuthenticated: boolean;
    tenantId: string;
    userId: string;
    email: string;
    roles: string[];
}

/**
 * Validates request authentication using JWT and enforces tenant isolation.
 */
export async function validateRequestAuth(req: Request): Promise<{
    valid: boolean;
    context?: AuthContext;
    response?: Response;
}> {
    // 1. Get Token from Authorization Header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            valid: false,
            response: new Response(
                JSON.stringify({
                    success: false,
                    error: "Authentication required. Please provide a Bearer token."
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        };
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify JWT
        const decoded = verifyToken(token);

        const authContext: AuthContext = {
            isAuthenticated: true,
            tenantId: decoded.tenantId,
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles || ['user']
        };

        return { valid: true, context: authContext };
    } catch (error) {
        return {
            valid: false,
            response: new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid or expired token."
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        };
    }
}

/**
 * Higher-order function to wrap route handlers with Auth & Audit
 */
export function withAuth(
    handler: (req: Request, context: AuthContext) => Promise<Response>
): (req: Request) => Promise<Response> {
    return async (req: Request) => {
        const { requestId } = initializeRequestContext(req, handler.name);

        const authResult = await validateRequestAuth(req);

        if (!authResult.valid) {
            AuditService.getInstance().log({
                tenantId: 'unauthenticated',
                requestId,
                action: 'AUTH_FAILURE',
                resource: req.url,
                status: 'FAILURE',
                details: { error: 'Invalid Auth', method: req.method },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult.response!;
        }

        const context = authResult.context!;

        AuditService.getInstance().log({
            tenantId: context.tenantId,
            userId: context.userId,
            requestId,
            action: 'API_ACCESS',
            resource: req.url,
            status: 'SUCCESS',
            details: { method: req.method }
        });

        return handler(req, context);
    };
}
