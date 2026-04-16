import { getMongoDb } from '../utils/mongoClient';
import { ObjectId } from 'mongodb';
import { AuditService } from './auditService';
import { hybridChatCompletion } from './llmRouter';

export interface VideoInterviewSession {
  _id?: ObjectId;
  tenantId: string;
  interviewId: string;
  roomUrl: string;
  roomName: string;
  recordingUrl?: string;
  transcript?: string;
  aiAnalysis?: {
    responseQuality: { question: string; score: number; feedback: string }[];
    communicationMetrics: {
      clarity: number;
      pace: number;
      confidence: number;
    };
    keyMoments: { timestamp: number; annotation: string }[];
    overallAssessment: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'analysing' | 'ready';
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'video_interview_sessions';
const DAILY_API = 'https://api.daily.co/v1';

export class VideoInterviewService {
  private static async createDailyRoom(name: string, expiresAt: Date): Promise<{ url: string; name: string }> {
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      // Return stub room if Daily.co not configured
      return { url: `https://recruiter.daily.co/${name}`, name };
    }

    const res = await fetch(`${DAILY_API}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        privacy: 'private',
        properties: {
          exp: Math.floor(expiresAt.getTime() / 1000),
          enable_recording: 'cloud',
          enable_transcription: 'deepgram',
        },
      }),
    });

    if (!res.ok) throw new Error(`Daily.co room creation failed: ${res.status}`);
    const data = await res.json() as { url: string; name: string };
    return { url: data.url, name: data.name };
  }

  static async createSession(
    tenantId: string,
    interviewId: string,
    scheduledAt: Date,
    userId: string
  ): Promise<VideoInterviewSession> {
    const db = getMongoDb();
    if (!db) throw new Error('DB not initialized');

    const expiresAt = new Date(scheduledAt.getTime() + 4 * 60 * 60 * 1000); // 4h window
    const roomName = `reckruit-${tenantId.slice(-6)}-${interviewId.slice(-6)}-${Date.now()}`;

    const { url } = await VideoInterviewService.createDailyRoom(roomName, expiresAt);

    const session: VideoInterviewSession = {
      tenantId,
      interviewId,
      roomUrl: url,
      roomName,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(session);
    session._id = result.insertedId;

    await AuditService.getInstance().log({
      tenantId,
      userId,
      action: 'video_session_created',
      resource: 'video_interview',
      resourceId: result.insertedId.toString(),
      status: 'SUCCESS',
      details: { interviewId },
      requestId: crypto.randomUUID(),
    });

    return session;
  }

  static async getSession(tenantId: string, sessionId: string): Promise<VideoInterviewSession | null> {
    const db = getMongoDb();
    if (!db) return null;
    return db.collection(COLLECTION).findOne({
      tenantId,
      _id: new ObjectId(sessionId),
    }) as Promise<VideoInterviewSession | null>;
  }

  static async handleWebhook(
    tenantId: string,
    sessionId: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const db = getMongoDb();
    if (!db) return;

    if (event === 'recording-ready') {
      await db.collection(COLLECTION).updateOne(
        { tenantId, _id: new ObjectId(sessionId) },
        {
          $set: {
            recordingUrl: payload.recording_url as string,
            status: 'analysing',
            updatedAt: new Date(),
          },
        }
      );
      // Trigger analysis asynchronously
      VideoInterviewService.analyzeRecording(tenantId, sessionId).catch(e =>
        console.error('[VideoInterview] Analysis failed:', e)
      );
    }

    if (event === 'transcript-ready') {
      await db.collection(COLLECTION).updateOne(
        { tenantId, _id: new ObjectId(sessionId) },
        { $set: { transcript: payload.transcript as string, updatedAt: new Date() } }
      );
    }
  }

  static async analyzeRecording(tenantId: string, sessionId: string): Promise<void> {
    const db = getMongoDb();
    if (!db) return;

    const session = await VideoInterviewService.getSession(tenantId, sessionId);
    if (!session?.transcript) return;

    const prompt = `Analyze this interview transcript and provide a structured evaluation.

Transcript:
"""
${session.transcript.slice(0, 4000)}
"""

Return JSON only:
{
  "responseQuality": [{"question": "string", "score": 0-10, "feedback": "string"}],
  "communicationMetrics": {"clarity": 0-10, "pace": 0-10, "confidence": 0-10},
  "keyMoments": [{"timestamp": 0, "annotation": "string"}],
  "overallAssessment": "string"
}`;

    try {
      const raw = await hybridChatCompletion(
        'You are an interview analysis model. Return valid JSON only.',
        prompt,
        { targetProvider: 'groq', max_tokens: 2048, temperature: 0.2 }
      );
      const json = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const analysis = JSON.parse(json);

      await db.collection(COLLECTION).updateOne(
        { tenantId, _id: new ObjectId(sessionId) },
        { $set: { aiAnalysis: analysis, status: 'ready', updatedAt: new Date() } }
      );
    } catch (e) {
      console.error('[VideoInterview] Analysis parse error:', e);
      await db.collection(COLLECTION).updateOne(
        { tenantId, _id: new ObjectId(sessionId) },
        { $set: { status: 'completed', updatedAt: new Date() } }
      );
    }
  }

  static async listSessions(tenantId: string, interviewId?: string): Promise<VideoInterviewSession[]> {
    const db = getMongoDb();
    if (!db) return [];
    const filter: Record<string, unknown> = { tenantId };
    if (interviewId) filter.interviewId = interviewId;
    return db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray() as Promise<VideoInterviewSession[]>;
  }
}
