import { EmbeddingService } from '../embeddingService';
import { autoRoutedChatCompletion } from '../llmRouter';
import { getQdrantClient, ensureCollectionExists } from '../../utils/qdrantClient';
import { ToonEncoder } from '../../utils/toon';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeDocument {
  id?: string;
  tenantId: string;
  title: string;
  content: string;
  category: 'policy' | 'benefits' | 'handbook' | 'general';
  createdAt: Date;
  parentDocumentId?: string;
  chunkIndex?: number;
}

const COLLECTION = 'knowledge_documents';

export class RagService {

  static async ingestDocument(tenantId: string, data: Omit<KnowledgeDocument, 'id' | 'tenantId' | 'createdAt'>): Promise<KnowledgeDocument> {
    const parentDocumentId = uuidv4();
    const chunks = RagService.chunkText(data.content, 1000, 200);
    
    // Ensure the collection exists in Qdrant with 384 dimensions for all-MiniLM-L6-v2
    await ensureCollectionExists(COLLECTION, 384);
    const qdrant = getQdrantClient();
    
    const points = [];
    const documents: KnowledgeDocument[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = await EmbeddingService.getEmbedding(chunk);
      const chunkId = uuidv4();
      
      const payload = {
        tenantId,
        title: data.title,
        content: chunk,
        category: data.category,
        parentDocumentId,
        chunkIndex: i,
        createdAt: new Date().toISOString(),
      };
      
      points.push({
        id: chunkId,
        vector,
        payload
      });
      
      documents.push({
        id: chunkId,
        ...payload,
        createdAt: new Date(payload.createdAt)
      });
    }

    if (points.length > 0) {
      await qdrant.upsert(COLLECTION, { wait: true, points });
      return documents[0];
    }
    
    return { ...data, tenantId, createdAt: new Date() } as KnowledgeDocument;
  }

  /**
   * Simple text chunking by characters, respecting word boundaries
   */
  static chunkText(text: string, maxChunkSize: number, overlap: number): string[] {
    if (text.length <= maxChunkSize) return [text];
    
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      let end = i + maxChunkSize;
      if (end < text.length) {
        // Try to find a space to break at
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > i + overlap) {
          end = lastSpace;
        }
      }
      chunks.push(text.slice(i, end).trim());
      i = end - overlap;
    }
    return chunks;
  }

  static async queryKnowledge(tenantId: string, query: string, limit = 3): Promise<string> {
    const qdrant = getQdrantClient();
    const queryVector = await EmbeddingService.getEmbedding(query);

    // Ensure the collection exists before querying to avoid errors if empty
    await ensureCollectionExists(COLLECTION, 384);

    // Qdrant vector search
    const searchResult = await qdrant.search(COLLECTION, {
      vector: queryVector,
      limit: limit,
      filter: {
        must: [
          {
            key: "tenantId",
            match: { value: tenantId }
          }
        ]
      }
    });

    const contextDocs = searchResult.map(point => point.payload) as unknown as KnowledgeDocument[];

    const contextText = ToonEncoder.encode(contextDocs.map(d => ({
      title: d.title,
      content: d.content,
      category: d.category
    })), 0, 'contextDocuments');

    const prompt = `You are an internal HR assistant. Use the following company knowledge (provided in TOON format) to answer the employee's query.
    If the information is not in the context, say you don't know and advise them to contact HR.
    
    CONTEXT (TOON format):
    ${contextText}
    
    QUERY: ${query}`;

    return await autoRoutedChatCompletion(
      "You are a helpful HR Knowledge Bot.",
      prompt,
      { temperature: 0.2 }
    );
  }
}
