import { getMongoDb } from '../../utils/mongoClient';
import { hybridChatCompletion } from '../llmRouter';
import { ObjectId } from 'mongodb';

export interface DocumentMetadata {
  filename: string;
  type: 'comp_bands' | 'role_framework' | 'policy' | 'handbook' | 'sop' | 'other';
  uploadedBy: string;
  description?: string;
}

export interface RAGResponse {
  answer: string;
  citations: { chunkId: string; filename: string; excerpt: string }[];
  confidence: 'high' | 'medium' | 'low';
}

interface DocumentChunk {
  _id?: ObjectId;
  tenantId: string;
  docId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
  metadata: DocumentMetadata;
  createdAt: Date;
}

const CHUNKS_COLLECTION = 'rag_chunks';
const DOCS_COLLECTION = 'rag_documents';
const CHUNK_SIZE = 800; // chars
const CHUNK_OVERLAP = 100;

export class RAGService {
  static async ingestDocument(
    tenantId: string,
    text: string,
    metadata: DocumentMetadata
  ): Promise<string> {
    const db = getMongoDb();
    if (!db) throw new Error('DB not initialized');

    // Store document record
    const docResult = await db.collection(DOCS_COLLECTION).insertOne({
      tenantId,
      ...metadata,
      textLength: text.length,
      createdAt: new Date(),
    });
    const docId = docResult.insertedId.toString();

    // Chunk the text
    const chunks: DocumentChunk[] = [];
    let i = 0;
    let chunkIndex = 0;
    while (i < text.length) {
      const end = Math.min(i + CHUNK_SIZE, text.length);
      chunks.push({
        tenantId,
        docId,
        filename: metadata.filename,
        chunkIndex: chunkIndex++,
        text: text.slice(i, end),
        metadata,
        createdAt: new Date(),
      });
      i += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    if (chunks.length > 0) {
      await db.collection(CHUNKS_COLLECTION).insertMany(chunks);
    }

    return docId;
  }

  static async query(
    tenantId: string,
    question: string
  ): Promise<RAGResponse> {
    const db = getMongoDb();
    if (!db) throw new Error('DB not initialized');

    // Simple keyword-based retrieval (no vector store dependency)
    // In production, replace with Qdrant vector search
    const keywords = question
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 5);

    const regexParts = keywords.map(k => new RegExp(k, 'i'));

    const chunks = await db.collection(CHUNKS_COLLECTION)
      .find({
        tenantId,
        $or: regexParts.map(r => ({ text: { $regex: r } })),
      })
      .limit(5)
      .toArray() as DocumentChunk[];

    if (chunks.length === 0) {
      return {
        answer: 'No relevant documents found in the knowledge base.',
        citations: [],
        confidence: 'low',
      };
    }

    const context = chunks
      .map((c, i) => `[${i + 1}] From "${c.filename}":\n${c.text}`)
      .join('\n\n');

    const prompt = `Answer the question using ONLY the provided context. Cite sources by number.

Context:
${context}

Question: ${question}

If the answer is not in the context, say "This information is not available in the knowledge base."`;

    try {
      const answer = await hybridChatCompletion(
        'You are a helpful HR knowledge assistant. Answer only from provided context.',
        prompt,
        { targetProvider: 'groq', max_tokens: 1024, temperature: 0.2 }
      );

      return {
        answer,
        citations: chunks.map((c, i) => ({
          chunkId: c._id?.toString() || String(i),
          filename: c.filename,
          excerpt: c.text.slice(0, 200) + (c.text.length > 200 ? '...' : ''),
        })),
        confidence: 'medium',
      };
    } catch {
      return {
        answer: 'Unable to generate answer.',
        citations: [],
        confidence: 'low',
      };
    }
  }

  static async listDocuments(tenantId: string): Promise<unknown[]> {
    const db = getMongoDb();
    if (!db) return [];
    return db.collection(DOCS_COLLECTION).find({ tenantId }).toArray();
  }

  static async deleteDocument(tenantId: string, docId: string): Promise<void> {
    const db = getMongoDb();
    if (!db) return;
    await Promise.all([
      db.collection(DOCS_COLLECTION).deleteOne({ tenantId, _id: new ObjectId(docId) }),
      db.collection(CHUNKS_COLLECTION).deleteMany({ tenantId, docId }),
    ]);
  }
}
