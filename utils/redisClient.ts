import { createClient, type RedisClientType } from 'redis';

// Create Redis client instance
let redisClient: RedisClientType | null = null;

// Initialize Redis client
export async function initializeRedisClient(): Promise<void> {
  try {
    // Get Redis URL from environment variable or use default
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 20000, // 20 seconds
        reconnectStrategy: (retries) => Math.min(retries * 500, 5000)
      },
      commandsQueueMaxLength: 10000
    });

    // Add error handling
    redisClient.on('error', (err) => {
      console.error('[Redis] Redis Client Error:', err);
    });

    // Connect to Redis
    await redisClient.connect();
    console.log('[Redis] Connected to Redis successfully');
  } catch (error) {
    console.error('[Redis] Failed to connect to Redis:', error);
    redisClient = null;
  }
}

// Get Redis client instance
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

// Set cache with expiration time
export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (!redisClient) {
    console.warn('[Redis] Redis client not initialized, skipping cache set');
    return;
  }

  try {
    const stringValue = JSON.stringify(value);
    await redisClient.setEx(key, ttlSeconds, stringValue);
  } catch (error) {
    console.error('[Redis] Error setting cache:', error);
  }
}

// Get cache value
export async function getCache(key: string): Promise<any | null> {
  if (!redisClient) {
    console.warn('[Redis] Redis client not initialized, skipping cache get');
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error('[Redis] Error getting cache:', error);
    return null;
  }
}

// Delete cache entry
export async function deleteCache(key: string): Promise<void> {
  if (!redisClient) {
    console.warn('[Redis] Redis client not initialized, skipping cache delete');
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('[Redis] Error deleting cache:', error);
  }
}

// Clear all cache entries
export async function clearCache(): Promise<void> {
  if (!redisClient) {
    console.warn('[Redis] Redis client not initialized, skipping cache clear');
    return;
  }

  try {
    await redisClient.flushAll();
  } catch (error) {
    console.error('[Redis] Error clearing cache:', error);
  }
}