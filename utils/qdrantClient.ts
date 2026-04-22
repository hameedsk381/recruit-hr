import { QdrantClient } from '@qdrant/js-client-rest';

let client: QdrantClient | null = null;

/**
 * Get Qdrant client instance
 */
export function getQdrantClient(): QdrantClient {
  if (!client) {
    const url = process.env.QDRANT_URL || 'http://localhost:6333';
    const apiKey = process.env.QDRANT_API_KEY;
    console.log(`[Qdrant] Connecting to Qdrant at ${url}`);
    client = new QdrantClient({ url, apiKey });
  }
  return client;
}

/**
 * Ensures a collection exists in Qdrant with the specified vector size
 */
export async function ensureCollectionExists(collectionName: string, vectorSize: number = 384) {
  const qdrant = getQdrantClient();
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      console.log(`[Qdrant] Creating collection ${collectionName} with vector size ${vectorSize}...`);
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine'
        }
      });
      console.log(`[Qdrant] Created collection ${collectionName} successfully`);
    }
  } catch (error) {
    console.error(`[Qdrant] Failed to ensure collection exists:`, error);
  }
}
