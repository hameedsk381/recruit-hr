import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { Resend } from 'resend';
import { ObjectId } from 'mongodb';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'talent@reckruit.ai';

export interface OutreachMessage {
  _id?: ObjectId;
  tenantId: string;
  profileId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  templateId?: string;
  subject?: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'failed';
  sentAt?: Date;
  openedAt?: Date;
  repliedAt?: Date;
  messageId?: string;
  createdAt: Date;
}

const COLLECTION = 'outreach_messages';

export class OutreachService {

  static async sendEmail(params: {
    tenantId: string;
    profileId: string;
    toEmail: string;
    toName: string;
    subject: string;
    htmlBody: string;
    templateId?: string;
    userId: string;
  }): Promise<OutreachMessage> {
    const db = getMongoDb();
    const now = new Date();

    const doc: OutreachMessage = {
      tenantId: params.tenantId,
      profileId: params.profileId,
      channel: 'email',
      templateId: params.templateId,
      subject: params.subject,
      body: params.htmlBody,
      status: 'queued',
      createdAt: now,
    };

    const result = await db.collection(COLLECTION).insertOne(doc);
    const msgId = result.insertedId.toString();

    try {
      const sendResult = await resend.emails.send({
        from: fromEmail,
        to: `${params.toName} <${params.toEmail}>`,
        subject: params.subject,
        html: params.htmlBody,
        headers: { 'X-Reckruit-Profile': params.profileId, 'X-Reckruit-Msg': msgId },
      });

      await db.collection(COLLECTION).updateOne(
        { _id: result.insertedId },
        { $set: { status: 'sent', sentAt: new Date(), messageId: sendResult.data?.id } }
      );

      await AuditService.getInstance().log({
        tenantId: params.tenantId, userId: params.userId, action: 'OUTREACH_EMAIL_SENT',
        resource: 'outreach', resourceId: msgId,
        status: 'SUCCESS', requestId: crypto.randomUUID(),
        details: { to: params.toEmail, subject: params.subject },
      });

      return { ...doc, _id: result.insertedId, status: 'sent', sentAt: new Date() };
    } catch (err) {
      await db.collection(COLLECTION).updateOne(
        { _id: result.insertedId },
        { $set: { status: 'failed' } }
      );
      throw err;
    }
  }

  static async sendSMS(params: {
    tenantId: string;
    profileId: string;
    toPhone: string;
    body: string;
    templateId?: string;
    userId: string;
  }): Promise<OutreachMessage> {
    const db = getMongoDb();

    // Twilio integration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;

    const doc: OutreachMessage = {
      tenantId: params.tenantId,
      profileId: params.profileId,
      channel: 'sms',
      templateId: params.templateId,
      body: params.body,
      status: 'queued',
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);

    if (accountSid && authToken && fromPhone) {
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: params.toPhone, From: fromPhone, Body: params.body }),
        }
      );

      const status = twilioRes.ok ? 'sent' : 'failed';
      await db.collection(COLLECTION).updateOne(
        { _id: result.insertedId },
        { $set: { status, sentAt: status === 'sent' ? new Date() : undefined } }
      );
    } else {
      console.warn('[Outreach] Twilio not configured, SMS not sent');
      await db.collection(COLLECTION).updateOne({ _id: result.insertedId }, { $set: { status: 'failed' } });
    }

    return { ...doc, _id: result.insertedId };
  }

  static async listMessages(tenantId: string, profileId?: string): Promise<OutreachMessage[]> {
    const db = getMongoDb();
    const query: Record<string, any> = { tenantId };
    if (profileId) query.profileId = profileId;
    return db.collection(COLLECTION).find(query).sort({ createdAt: -1 }).toArray() as Promise<OutreachMessage[]>;
  }

  // Called by email tracking webhook (pixel / link click)
  static async handleTrackingEvent(messageId: string, event: 'opened' | 'replied'): Promise<void> {
    const db = getMongoDb();
    const field = event === 'opened' ? 'openedAt' : 'repliedAt';
    await db.collection(COLLECTION).updateOne(
      { messageId },
      { $set: { status: event, [field]: new Date() } }
    );
  }
}
