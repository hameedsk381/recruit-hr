import { getMongoDb } from '../../utils/mongoClient';
import { EmbeddingService } from '../embeddingService';
import { autoRoutedChatCompletion } from '../llmRouter';
import { ObjectId } from 'mongodb';

export interface KnowledgeDocument {
  _id?: ObjectId;
  tenantId: string;
  title: string;
  content: string;
  vector?: number[];
  category: 'policy' | 'benefits' | 'handbook' | 'general';
  createdAt: Date;
}

const COLLECTION = 'knowledge_documents';

export class RagService {

  static async ingestDocument(tenantId: string, data: Omit<KnowledgeDocument, '_id' | 'tenantId' | 'vector' | 'createdAt'>): Promise<KnowledgeDocument> {
    const db = getMongoDb();
    
    // Generate embedding
    const vector = await EmbeddingService.getEmbedding(data.content);
    
    const doc: KnowledgeDocument = {
      ...data,
      tenantId,
      vector,
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async queryKnowledge(tenantId: string, query: string, limit = 3): Promise<string> {
    const db = getMongoDb();
    const queryVector = await EmbeddingService.getEmbedding(query);

    // Vector search (Mock for Phase 3, uses MongoDB Atlas format)
    const contextDocs = await db.collection(COLLECTION).aggregate([
      {
        "$vectorSearch": {
          "index": "knowledge_vector_index",
          "path": "vector",
          "queryVector": queryVector,
          "numCandidates": 50,
          "limit": limit,
          "filter": { "tenantId": tenantId }
        }
      }
    ]).toArray() as KnowledgeDocument[];

    const contextText = contextDocs.map(d => `--- ${d.title} ---\n${d.content}`).join('\n\n');

    const prompt = `You are an internal HR assistant. Use the following company knowledge to answer the employee's query.
    If the information is not in the context, say you don't know and advise them to contact HR.
    
    CONTEXT:
    ${contextText}
    
    QUERY: ${query}`;

    return await autoRoutedChatCompletion(
      "You are a helpful HR Knowledge Bot.",
      prompt,
      { temperature: 0.2 }
    );
  }
}
