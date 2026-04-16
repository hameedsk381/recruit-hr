import { hasRole, hasPermission, Role } from '../utils/permissions';
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

interface AuthOptions {
    requiredRoles?: Role[];
    requiredPermission?: string;
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
 * Higher-order function to wrap route handlers with Auth, RBAC & Audit
 */
export function withAuth(
    handler: (req: Request, context: AuthContext) => Promise<Response>,
    options?: AuthOptions
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

        // RBAC Enforcement
        if (options?.requiredRoles && !hasRole(context, options.requiredRoles)) {
            return new Response(JSON.stringify({
                success: false,
                error: "Insufficient roles to access this resource."
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        if (options?.requiredPermission && !hasPermission(context, options.requiredPermission)) {
            return new Response(JSON.stringify({
                success: false,
                error: "Access denied. Required permission missing."
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

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
