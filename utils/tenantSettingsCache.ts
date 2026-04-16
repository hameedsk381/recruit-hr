import { getMongoDb } from "./mongoClient";
import { getRedisClient } from "./redisClient";

const CACHE_KEY = "global:allowed_origins";
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Returns the set of all allowed origins across every tenant + env-var base domains.
 * Result is cached in Redis for 5 minutes.
 */
export async function getAllowedOriginsSet(): Promise<Set<string>> {
  // 1. Try Redis cache
  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(CACHE_KEY);
      if (cached) return new Set(JSON.parse(cached));
    } catch {
      // cache miss — continue to DB
    }
  }

  // 2. Seed with env-var base domains (always allowed)
  const baseOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const allOrigins = new Set<string>(baseOrigins);

  // 3. Pull per-tenant allowlists from MongoDB
  try {
    const db = getMongoDb();
    const tenants = await db
      .collection("tenants")
      .find(
        { allowedOrigins: { $exists: true, $ne: [] } },
        { projection: { allowedOrigins: 1 } }
      )
      .toArray();

    for (const t of tenants) {
      if (Array.isArray(t.allowedOrigins)) {
        for (const origin of t.allowedOrigins) {
          if (typeof origin === "string" && origin.startsWith("http")) {
            allOrigins.add(origin);
          }
        }
      }
    }
  } catch (err) {
    console.error("[CorsCache] Failed to load tenant origins from DB:", err);
  }

  // 4. Write to Redis
  if (client) {
    try {
      await client.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify([...allOrigins]));
    } catch {
      // non-fatal
    }
  }

  return allOrigins;
}

/**
 * Returns the allowed origins for a single tenant (bypasses global cache).
 */
export async function getTenantAllowedOrigins(tenantId: string): Promise<Set<string>> {
  try {
    const db = getMongoDb();
    const tenant = await db
      .collection("tenants")
      .findOne({ tenantId }, { projection: { allowedOrigins: 1 } });
    const origins: string[] = Array.isArray(tenant?.allowedOrigins) ? tenant.allowedOrigins : [];
    return new Set(origins);
  } catch {
    return new Set();
  }
}

/**
 * Force-invalidates the global origins cache (call after tenant settings update).
 */
export async function invalidateOriginsCache(): Promise<void> {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(CACHE_KEY);
    } catch {
      // non-fatal
    }
  }
}
