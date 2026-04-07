import { getMongoDb } from '../utils/mongoClient';
import { AppLogger } from '../utils/logger';

export interface AuditLogEntry {
    timestamp: Date;
    tenantId: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: 'SUCCESS' | 'FAILURE' | 'WARNING';
    details?: Record<string, any>;
    ipAddress?: string;
    requestId: string;
}

const AUDIT_COLLECTION = 'audit_logs';

export class AuditService {
    private static instance: AuditService;
    private constructor() { }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    public async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
        const logEntry: AuditLogEntry = {
            ...entry,
            timestamp: new Date()
        };

        try {
            const db = getMongoDb();
            if (!db) return;
            await db.collection(AUDIT_COLLECTION).insertOne(logEntry);
        } catch (error) {
            console.error('AuditService: Failed to write audit log', error);
        }
    }
}

export function logAudit(
    logger: AppLogger,
    action: string,
    details?: Record<string, any>,
    status: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS'
) {
    AuditService.getInstance().log({
        tenantId: logger.tenantId,
        userId: logger.userId,
        requestId: logger.requestId,
        action,
        resource: logger.context,
        status,
        details
    });
}
