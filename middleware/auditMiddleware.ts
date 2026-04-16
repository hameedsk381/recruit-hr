import { AuthContext } from "./authMiddleware";
import { getMongoDb } from "../utils/mongoClient";

export async function auditMiddleware(req: Request, context: AuthContext, status: number) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        try {
            const db = getMongoDb();
            const url = new URL(req.url);
            
            const logEntry = {
                tenantId: context.tenantId,
                userId: context.userId,
                method: req.method,
                path: url.pathname,
                status,
                timestamp: new Date(),
                ip: req.headers.get('x-forwarded-for') || '127.0.0.1'
            };

            await db.collection('audit_logs').insertOne(logEntry);
        } catch (e) {
            console.error('[AuditMiddleware] Failed to log audit entry:', e);
        }
    }
}
