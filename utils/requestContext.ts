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
 */
export function initializeRequestContext(req: Request, contextName: string): RequestContext {
    const requestId = req.headers.get('x-request-id') || randomUUID();
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const logger = createLogger(requestId, contextName, tenantId);

    return { requestId, tenantId, logger };
}
