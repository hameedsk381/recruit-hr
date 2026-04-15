import { randomUUID } from 'crypto';
import { createLogger, AppLogger } from './logger';

export interface RequestContext {
    requestId: string;
    tenantId: string;
    logger: AppLogger;
}

/**
 * Initializes the request context by extracting headers and creating a logger.
 * This ensures consistent tenant ID and request ID tracking across the application.
 * Accepts optional overrides for tenantId and userId (e.g. from AuthContext).
 */
export function initializeRequestContext(req: Request, contextName: string, overrideTenantId?: string, overrideUserId?: string): RequestContext {
    const requestId = req.headers.get('x-request-id') || randomUUID();
    const headersTenantId = req.headers.get('x-tenant-id');
    
    // Priority: 1. Manual override, 2. Header, 3. 'default'
    const tenantId = overrideTenantId || headersTenantId || 'default';
    const logger = createLogger(requestId, contextName, tenantId, overrideUserId);

    return { requestId, tenantId, logger };
}
