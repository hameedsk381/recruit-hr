import { getMongoDb } from "../utils/mongoClient";
import { AuthContext } from "../middleware/authMiddleware";
import { ROLES } from "../utils/permissions";
import { AuditService } from "../services/auditService";
import { z } from "zod";

/**
 * Fetch tenant-specific settings (Webhooks, Notifications)
 */
export async function getTenantSettingsHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        const settings = await db.collection('tenants').findOne({ tenantId: context.tenantId });

        if (!settings) {
            return new Response(JSON.stringify({
                success: true,
                settings: {
                    tenantId: context.tenantId,
                    slackWebhookUrl: "",
                    teamsWebhookUrl: "",
                    notificationsEnabled: true
                }
            }), { status: 200 });
        }

        return new Response(JSON.stringify({ success: true, settings }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch settings" }), { status: 500 });
    }
}

/**
 * Update tenant-specific settings (Admin Only)
 */
export async function updateTenantSettingsHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        // Strict Role Check for Admin settings
        if (!context.roles.includes(ROLES.ADMIN)) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized. Admin role required." }), { status: 403 });
        }

        const body = await req.json();
        const { slackWebhookUrl, teamsWebhookUrl, notificationsEnabled } = body;

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        await db.collection('tenants').updateOne(
            { tenantId: context.tenantId },
            { 
                $set: { 
                    slackWebhookUrl, 
                    teamsWebhookUrl, 
                    notificationsEnabled,
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );

        return new Response(JSON.stringify({ success: true, message: "Tenant settings updated" }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to update settings" }), { status: 500 });
    }
}

const BlindScreeningSchema = z.object({
    enabled: z.boolean(),
    redactFields: z.array(z.enum(['name', 'email', 'phone', 'photo', 'address', 'linkedin', 'nationality'])).default(['name', 'email', 'phone']),
    revealAfterStage: z.enum(['shortlist', 'interview', 'offer', 'never']).default('interview'),
});

/**
 * PATCH /v1/settings/blind-screening — Toggle blind screening mode (Admin only)
 */
export async function updateBlindScreeningHandler(req: Request, context: AuthContext): Promise<Response> {
    if (!context.roles.includes(ROLES.ADMIN)) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized. Admin role required.' }), { status: 403 });
    }

    let body: any;
    try { body = await req.json(); } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400 });
    }

    const parsed = BlindScreeningSchema.safeParse(body);
    if (!parsed.success) {
        return new Response(JSON.stringify({ success: false, error: parsed.error.message }), { status: 400 });
    }

    const db = getMongoDb();
    await db.collection('tenants').updateOne(
        { tenantId: context.tenantId },
        { $set: { blindScreening: parsed.data, updatedAt: new Date() } },
        { upsert: true }
    );

    await AuditService.getInstance().log({
        tenantId: context.tenantId, userId: context.userId,
        action: 'BLIND_SCREENING_UPDATED',
        resource: 'tenant_settings', resourceId: context.tenantId,
        status: 'SUCCESS', requestId: crypto.randomUUID(),
        details: parsed.data,
    });

    return new Response(JSON.stringify({ success: true, blindScreening: parsed.data }), { status: 200 });
}
