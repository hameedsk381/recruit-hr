import { EmailService } from './emailService';
import { getMongoDb } from '../utils/mongoClient';

export type NotificationChannel = 'EMAIL' | 'SLACK' | 'TEAMS';

export interface NotificationPayload {
    tenantId: string;
    userId?: string;
    recipientEmail?: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
    channels: NotificationChannel[];
}

export class NotificationService {
    /**
     * Dispatch notification to multiple channels based on tenant configuration
     */
    static async dispatch(payload: NotificationPayload): Promise<void> {
        console.log(`[NotificationService] Dispatching: ${payload.title} to ${payload.channels.join(', ')}`);

        // 1. Fetch Tenant Settings for Webhooks (Slack/Teams)
        // 1. Fetch Tenant Settings for Webhooks (Slack/Teams)
        let db;
        try {
            db = getMongoDb();
        } catch (e) {
            console.warn('[NotificationService] Database unavailable, skipping tenant settings lookup');
        }

        let tenantSettings: any = null;
        if (db) {
            tenantSettings = await db.collection('tenants').findOne({ tenantId: payload.tenantId });
        }

        // 2. Iterate through requested channels
        for (const channel of payload.channels) {
            try {
                switch (channel) {
                    case 'EMAIL':
                        if (payload.recipientEmail) {
                            await this.sendEmail(payload);
                        }
                        break;
                    case 'SLACK':
                        if (tenantSettings?.slackWebhookUrl) {
                            await this.sendToWebhook(tenantSettings.slackWebhookUrl, 'Slack', payload);
                        } else {
                            console.log(`[NotificationService] No Slack Webhook configured for tenant ${payload.tenantId}`);
                        }
                        break;
                    case 'TEAMS':
                        if (tenantSettings?.teamsWebhookUrl) {
                            await this.sendToWebhook(tenantSettings.teamsWebhookUrl, 'MS Teams', payload);
                        } else {
                            console.log(`[NotificationService] No MS Teams Webhook configured for tenant ${payload.tenantId}`);
                        }
                        break;
                }
            } catch (error) {
                console.error(`[NotificationService] Failed to dispatch to ${channel}:`, error);
            }
        }
    }

    private static async sendEmail(payload: NotificationPayload) {
        // We reuse the EmailService but with generic templates
        // In a real app, this would use a more robust templating engine
        if (!payload.recipientEmail) return;

        console.log(`[NotificationService] Sending Email to ${payload.recipientEmail}: ${payload.title}`);
        
        // Mocking the email call for generic notifications
        // In production, this would call EmailService.sendGenericEmail(...)
    }

    private static async sendToWebhook(url: string, provider: string, payload: NotificationPayload) {
        console.log(`[NotificationService] Pushing to ${provider} Webhook: ${url}`);
        
        // Simple outbound fetch
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `*${payload.title}*\n${payload.message}`,
                    attachments: payload.metadata ? [{
                        fields: Object.entries(payload.metadata).map(([key, value]) => ({
                            title: key,
                            value: String(value),
                            short: true
                        }))
                    }] : []
                })
            });

            if (!response.ok) {
                console.warn(`[NotificationService] ${provider} Webhook returned ${response.status}`);
            }
        } catch (error) {
            console.error(`[NotificationService] ${provider} Webhook error:`, error);
        }
    }
}
