import { pipeline, env } from '@xenova/transformers';

// Disable sending telemetry if necessary
env.allowRemoteModels = true;
env.localModelPath = './models';

// Singleton instance for the embedding pipeline
class PipelineSingleton {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      // Create pipeline instance
      this.instance = await pipeline(this.task as any, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export class EmbeddingService {
  /**
   * Generates vector embeddings using sentence-transformers/all-MiniLM-L6-v2.
   * Produces 384-dimensional vectors fully locally without external APIs.
   */
  static async getEmbedding(text: string): Promise<number[]> {
    try {
      const extractor = await PipelineSingleton.getInstance();
      
      // Compute embeddings
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      // Output is a Tensor, we need to convert it to a standard JS array
      return Array.from(output.data);
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      throw error;
    }
  }
}
