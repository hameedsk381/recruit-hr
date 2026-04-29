/**
 * MongoDB Client Utility
 * Manages MongoDB connection for natural language queries
 */

import { MongoClient, Db } from 'mongodb';
import { getRequiredEnv, isProduction } from './env';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Initialize MongoDB connection
 */
export async function initializeMongoClient(): Promise<void> {
  try {
    const mongoUrl = isProduction() ? getRequiredEnv('MONGODB_URL') : (process.env.MONGODB_URL || 'mongodb://localhost:27017');
    const dbName = isProduction() ? getRequiredEnv('MONGODB_DB_NAME') : (process.env.MONGODB_DB_NAME || 'hr_tools');
    
    if (!client) {
      console.log('[MongoDB] Connecting to MongoDB...');
      client = new MongoClient(mongoUrl);
      await client.connect();
      db = client.db(dbName);
      console.log('[MongoDB] Connected to MongoDB successfully');
    }
  } catch (error) {
    console.error('[MongoDB] Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Get MongoDB database instance
 */
export function getMongoDb(): Db {
  if (!db) {
    throw new Error('MongoDB not initialized. Call initializeMongoClient() first.');
  }
  return db;
}

/**
 * Get a specific collection by name
 */
export function getCollection(name: string) {
  return getMongoDb().collection(name);
}

/**
 * Get MongoDB client instance
 */
export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB not initialized. Call initializeMongoClient() first.');
  }
  return client;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

/**
 * Execute a raw MongoDB query
 */
export async function executeMongoQuery(
  collectionName: string,
  operation: string,
  query: any = {},
  options: any = {}
): Promise<any> {
  try {
    const database = getMongoDb();
    const collection = database.collection(collectionName);
    
    switch (operation.toLowerCase()) {
      case 'find':
        const limit = options.limit || 100;
        const projection = options.projection || {};
        const sort = options.sort || {};
        return await collection.find(query).project(projection).sort(sort).limit(limit).toArray();
      
      case 'findone':
        return await collection.findOne(query, options);
      
      case 'count':
      case 'countdocuments':
        return await collection.countDocuments(query);
      
      case 'aggregate':
        // query should be an array (pipeline)
        const pipeline = Array.isArray(query) ? query : [query];
        return await collection.aggregate(pipeline).toArray();
      
      case 'distinct':
        const field = options.field || '_id';
        return await collection.distinct(field, query);
      
      case 'insertone':
        const insertResult = await collection.insertOne(query);
        return { insertedId: insertResult.insertedId, acknowledged: insertResult.acknowledged };
      
      case 'insertmany':
        const insertManyResult = await collection.insertMany(Array.isArray(query) ? query : [query]);
        return { insertedCount: insertManyResult.insertedCount, insertedIds: insertManyResult.insertedIds };
      
      case 'updateone':
        const updateFilter = options.filter || {};
        const updateResult = await collection.updateOne(updateFilter, query);
        return { matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount };
      
      case 'updatemany':
        const updateManyFilter = options.filter || {};
        const updateManyResult = await collection.updateMany(updateManyFilter, query);
        return { matchedCount: updateManyResult.matchedCount, modifiedCount: updateManyResult.modifiedCount };
      
      case 'deleteone':
        const deleteResult = await collection.deleteOne(query);
        return { deletedCount: deleteResult.deletedCount };
      
      case 'deletemany':
        const deleteManyResult = await collection.deleteMany(query);
        return { deletedCount: deleteManyResult.deletedCount };
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  } catch (error) {
    console.error('[MongoDB] Query execution error:', error);
    throw error;
  }
}

/**
 * List all collections in the database
 */
export async function listCollections(): Promise<string[]> {
  try {
    const database = getMongoDb();
    const collections = await database.listCollections().toArray();
    return collections.map(col => col.name);
  } catch (error) {
    console.error('[MongoDB] Failed to list collections:', error);
    throw error;
  }
}

/**
 * Get collection schema/sample
 */
export async function getCollectionSample(collectionName: string, limit: number = 3): Promise<any[]> {
  try {
    const database = getMongoDb();
    const collection = database.collection(collectionName);
    return await collection.find({}).limit(limit).toArray();
  } catch (error) {
    console.error('[MongoDB] Failed to get collection sample:', error);
    throw error;
  }
}
