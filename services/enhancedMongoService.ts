/**
 * Enhanced MongoDB Query Service
 * Provides robust natural language to MongoDB query translation with tenant isolation.
 */

import { groqChatCompletion } from '../utils/groqClient';
import { executeMongoQuery, listCollections, getCollectionSample, getMongoDb } from '../utils/mongoClient';

/**
 * Supported MongoDB operations
 */
export const SUPPORTED_OPERATIONS = [
  'find',
  'findOne',
  'count',
  'aggregate',
  'distinct',
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany'
] as const;

export type MongoOperation = typeof SUPPORTED_OPERATIONS[number];

/**
 * Query generation result
 */
export interface MongoQueryResult {
  collection: string;
  operation: MongoOperation;
  query: any;
  options?: any;
  explanation: string;
}

/**
 * Enhanced query generation with better AI prompting and tenant isolation
 */
export async function generateEnhancedMongoQuery(
  naturalLanguageQuery: string,
  tenantId: string,
  targetCollection?: string,
  allowedOperations: MongoOperation[] = ['find', 'count', 'aggregate', 'distinct']
): Promise<MongoQueryResult> {
  try {
    const collections = await listCollections();

    if (collections.length === 0) {
      throw new Error('No collections found in database');
    }

    if (targetCollection && !collections.includes(targetCollection)) {
      throw new Error(`Collection '${targetCollection}' not found.`);
    }

    const collectionSchemas: { [key: string]: any[] } = {};
    const collectionsToAnalyze = targetCollection ? [targetCollection] : collections.slice(0, 8);

    for (const collName of collectionsToAnalyze) {
      try {
        collectionSchemas[collName] = await getCollectionSample(collName, 3);
      } catch (error) {
        console.warn(`[EnhancedMongo] Could not get sample for collection ${collName}:`, error);
      }
    }

    const schemaInfo = Object.entries(collectionSchemas)
      .map(([name, samples]) => {
        if (samples.length === 0) return `Collection: ${name} (empty)`;
        const fields = new Set<string>();
        samples.forEach(doc => Object.keys(doc).forEach(key => fields.add(key)));
        return `Collection: ${name}\nFields: ${Array.from(fields).join(', ')}\nSample document: ${JSON.stringify(samples[0], null, 2)}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert MongoDB query generator. 

DATABASE INFORMATION:
Collections: ${collections.join(', ')}

COLLECTION SCHEMAS:
${schemaInfo}

ALLOWED OPERATIONS: ${allowedOperations.join(', ')}

MANDATORY DATA ISOLATION:
Every filter or $match stage MUST include "tenantId": "${tenantId}". This is non-negotiable for security.

OUTPUT FORMAT (strict JSON):
{
  "collection": "exact_collection_name",
  "operation": "find|count|aggregate|distinct",
  "query": {},
  "options": {"projection": {}, "sort": {}, "limit": 10},
  "explanation": "Brief explanation"
}`;

    const userPrompt = `Convert this to MongoDB query: "${naturalLanguageQuery}"
${targetCollection ? `REQUIRED: Use collection "${targetCollection}"` : 'Auto-detect the best collection'}`;

    const aiResponse = await groqChatCompletion(systemPrompt, userPrompt, 0.2, 2048);

    let cleanedResponse = aiResponse.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedResponse = jsonMatch[0];

    const parsed = JSON.parse(cleanedResponse);

    // Safety injection of tenantId
    if (parsed.query && typeof parsed.query === 'object') {
      parsed.query.tenantId = tenantId;
    }

    return {
      collection: parsed.collection,
      operation: parsed.operation as MongoOperation,
      query: parsed.query || {},
      options: parsed.options || {},
      explanation: parsed.explanation || 'Query generated'
    };
  } catch (error) {
    console.error('[EnhancedMongo] Error generating query:', error);
    throw error;
  }
}

/**
 * Execute natural language query with tenant isolation
 */
export async function executeEnhancedNLQuery(
  naturalLanguageQuery: string,
  options: {
    tenantId: string;
    targetCollection?: string;
    dryRun?: boolean;
    maxResults?: number;
    allowedOperations?: MongoOperation[];
    readOnly?: boolean;
  }
): Promise<{
  success: boolean;
  query: MongoQueryResult;
  results?: any;
  resultCount?: number;
  executionTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    let allowedOps = options.allowedOperations || ['find', 'count', 'aggregate', 'distinct'];
    if (options.readOnly) {
      allowedOps = allowedOps.filter(op => ['find', 'findOne', 'count', 'aggregate', 'distinct'].includes(op));
    }

    const generatedQuery = await generateEnhancedMongoQuery(
      naturalLanguageQuery,
      options.tenantId,
      options.targetCollection,
      allowedOps
    );

    if (options.dryRun) {
      return { success: true, query: generatedQuery, executionTime: Date.now() - startTime };
    }

    const execOptions: any = { ...generatedQuery.options };
    if (options.maxResults && !execOptions.limit) {
      execOptions.limit = options.maxResults;
    }

    const results = await executeMongoQuery(
      generatedQuery.collection,
      generatedQuery.operation,
      generatedQuery.query,
      execOptions
    );

    let resultCount = Array.isArray(results) ? results.length : (results ? 1 : 0);

    return {
      success: true,
      query: generatedQuery,
      results,
      resultCount,
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      query: { collection: '', operation: 'find', query: {}, explanation: '' },
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Get comprehensive database information (Admin or Tenant scoped)
 */
export async function getEnhancedDatabaseInfo(): Promise<any> {
  const collections = await listCollections();
  const db = getMongoDb();
  const stats: any = { collections: [], totalDocuments: 0 };

  for (const coll of collections) {
    const count = await db.collection(coll).countDocuments();
    stats.collections.push({ name: coll, count });
    stats.totalDocuments += count;
  }
  return stats;
}
