import { getMongoDb } from '../utils/mongoClient';
import { AuditService } from './auditService';
import { ObjectId } from 'mongodb';
import { autoRoutedChatCompletion } from './llmRouter';

export interface VideoSession {
  _id?: ObjectId;
  tenantId: string;
  interviewId: ObjectId;
  roomUrl: string;
  recordingUrl?: string;
  transcript?: string;
  aiAnalysis?: any;
  status: 'scheduled' | 'in_progress' | 'completed' | 'analysing' | 'ready';
  scheduledAt: Date;
  createdAt: Date;
}

const COLLECTION = 'video_sessions';

export class VideoInterviewService {

  static async createSession(tenantId: string, interviewId: string, scheduledAt: Date, userId: string): Promise<VideoSession> {
    const db = getMongoDb();
    
    // In production, call Daily.co or Whereby API here
    const roomUrl = `https://video.reckruit.ai/${tenantId}/${crypto.randomUUID()}`;
    
    const doc: VideoSession = {
      tenantId,
      interviewId: new ObjectId(interviewId),
      roomUrl,
      status: 'scheduled',
      scheduledAt,
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);
    
    await AuditService.getInstance().log({
      tenantId, userId, action: 'VIDEO_SESSION_CREATED',
      resource: 'video_session', resourceId: result.insertedId.toString(),
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });

    return { ...doc, _id: result.insertedId };
  }

  static async getSession(tenantId: string, id: string): Promise<VideoSession | null> {
    const db = getMongoDb();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id), tenantId }) as Promise<VideoSession | null>;
  }

  static async listSessions(tenantId: string, interviewId?: string): Promise<VideoSession[]> {
    const db = getMongoDb();
    const query: Record<string, any> = { tenantId };
    if (interviewId) query.interviewId = new ObjectId(interviewId);
    return db.collection(COLLECTION).find(query).sort({ scheduledAt: -1 }).toArray() as Promise<VideoSession[]>;
  }

  static async handleWebhook(tenantId: string, sessionId: string, event: string, payload: any): Promise<void> {
    const db = getMongoDb();
    
    if (event === 'recording.ready') {
      const recordingUrl = payload.recordingUrl;
      await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(sessionId), tenantId },
        { $set: { recordingUrl, status: 'analysing' } }
      );
      
      // Trigger async analysis
      this.analyzeSession(tenantId, sessionId, recordingUrl);
    }
  }

  static async analyzeSession(tenantId: string, sessionId: string, recordingUrl: string): Promise<void> {
    const db = getMongoDb();
    
    // 1. Transcription (Mock for Phase 3)
    const transcript = "Candidate: I have 5 years of experience in React. Interviewer: That's great.";
    
    // 2. AI Analysis
    const analysisPrompt = `Analyze this interview transcript for response quality and communication skills:
    "${transcript}"
    
    Return JSON: { "quality": 1-10, "communication": "Detailed feedback", "keyMoments": [] }`;
    
    const analysisRaw = await autoRoutedChatCompletion(
      "You are an interview analyst.",
      analysisPrompt,
      { temperature: 0.1 }
    );
    
    let analysis = {};
    try { analysis = JSON.parse(analysisRaw); } catch { analysis = { raw: analysisRaw }; }
    
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(sessionId), tenantId },
      { $set: { transcript, aiAnalysis: analysis, status: 'ready' } }
    );
    
    await AuditService.getInstance().log({
      tenantId, action: 'VIDEO_ANALYSIS_COMPLETE',
      resource: 'video_session', resourceId: sessionId,
      status: 'SUCCESS', requestId: crypto.randomUUID(),
    });
  }
}
