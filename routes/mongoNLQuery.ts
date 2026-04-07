/**
 * MongoDB Natural Language Query Route
 * Allows users to query MongoDB using natural language via MCP
 */

import { createLogger } from '../utils/logger';
import { executeEnhancedNLQuery, getEnhancedDatabaseInfo } from '../services/enhancedMongoService';
import { getDatabaseInfo } from '../services/mcpMongoService';

import { AuthContext } from '../middleware/authMiddleware';

export async function mongoNLQueryHandler(req: Request, context: AuthContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId, 'MongoNLQueryHandler', context.tenantId, context.userId);

  try {
    logger.info('Received MongoDB natural language query request');

    // Parse request body
    const body = await req.json();
    const { query, collection, dryRun, maxResults } = body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      logger.error('Invalid query provided');
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: 'Query is required and must be a non-empty string'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if this is a database metadata question
    const metadataKeywords = [
      'how many collection',
      'list collection',
      'show collection',
      'what collection',
      'available collection',
      'database collection'
    ];

    const lowerQuery = query.toLowerCase();
    const isMetadataQuery = metadataKeywords.some(keyword => lowerQuery.includes(keyword));

    if (isMetadataQuery) {
      logger.info('Detected database metadata query, suggesting /mongo-info endpoint');

      // Get the actual database info to answer the question
      const dbInfo = await getDatabaseInfo();

      return new Response(
        JSON.stringify({
          success: true,
          requestId,
          naturalLanguageQuery: query,
          isMetadataQuery: true,
          answer: `There are ${dbInfo.collections.length} collections in the database: ${dbInfo.collections.join(', ')}`,
          suggestion: 'For database metadata queries, use GET /mongo-info endpoint for more detailed information',
          collections: dbInfo.collections,
          totalCollections: dbInfo.collections.length
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    logger.info('Processing natural language query', {
      query: query.substring(0, 100),
      collection: collection || 'auto-detect',
      dryRun: dryRun || false,
      maxResults: maxResults || 100
    });

    // Execute the natural language query with tenant isolation
    const result = await executeEnhancedNLQuery(
      query,
      {
        tenantId: context.tenantId,
        targetCollection: collection,
        dryRun: dryRun || false,
        maxResults: maxResults || 100,
        readOnly: true
      }
    );

    if (!result.success) {
      logger.error('Query execution failed', undefined, { error: result.error });
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: result.error,
          generatedQuery: result.query
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    logger.info('Query executed successfully', {
      collection: result.query.collection,
      operation: result.query.operation,
      resultCount: result.resultCount,
      executionTime: result.executionTime
    });

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        naturalLanguageQuery: query,
        generatedQuery: {
          collection: result.query.collection,
          operation: result.query.operation,
          query: result.query.query,
          options: result.query.options,
          explanation: result.query.explanation
        },
        results: result.results,
        resultCount: result.resultCount,
        executionTime: result.executionTime,
        dryRun: dryRun || false
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logger.error('MongoDB NL query request failed', error instanceof Error ? error : new Error(String(error)));

    return new Response(
      JSON.stringify({
        success: false,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Get Database Info Handler
 * Returns available collections and their schemas
 */
export async function mongoDatabaseInfoHandler(req: Request, context: AuthContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId, 'MongoDatabaseInfoHandler', context.tenantId, context.userId);

  try {
    logger.info('Received database info request');

    const dbInfo = await getEnhancedDatabaseInfo();

    logger.info('Database info retrieved successfully', {
      collectionsCount: dbInfo.collections.length,
      totalDocuments: dbInfo.statistics.totalDocuments
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        collections: dbInfo.collections,
        schemas: dbInfo.schemas,
        totalCollections: dbInfo.totalCollections,
        statistics: dbInfo.statistics
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logger.error('Database info request failed', error instanceof Error ? error : new Error(String(error)));

    return new Response(
      JSON.stringify({
        success: false,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
