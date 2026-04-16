import { OpenAI } from 'openai';
import { Ollama } from 'ollama';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-mock-key-for-dev' });
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

export class EmbeddingService {
  /**
   * Hybrid Embedding function
   * Uses OpenAI by default, falls back to Ollama for local/PII requirements
   */
  static async getEmbedding(text: string, useLocal = false): Promise<number[]> {
    if (useLocal) {
      const response = await ollama.embeddings({
        model: process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large',
        prompt: text,
      });
      return response.embedding;
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
