import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

/**
 * Enterprise Rate Limiter (Redis-backed)
 * Provides horizontal scalability for rate limiting across multiple backend instances.
 */
export async function rateLimit(
  key: string,
  limit: number,
  durationSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const reset = now + durationSeconds;
  const redisKey = `ratelimit:${key}`;

  const multi = redis.multi();
  multi.incr(redisKey);
  multi.expire(redisKey, durationSeconds);
  
  const results = await multi.exec();
  const count = (results?.[0]?.[1] as number) || 0;

  if (count > limit) {
    const ttl = await redis.ttl(redisKey);
    return {
      allowed: false,
      remaining: 0,
      reset: now + (ttl > 0 ? ttl : 0)
    };
  }

  return {
    allowed: true,
    remaining: limit - count,
    reset
  };
}

/**
 * Middleware adapter for standard requests
 */
export async function rateLimitMiddleware(req: Request, ip: string): Promise<Response | null> {
    const url = new URL(req.url);
    
    // Stricter limits for Public endpoints
    const isPublic = url.pathname.startsWith("/public");
    const limit = isPublic ? 30 : 100; // 30 reqs/min for public, 100 for auth
    const duration = 60;

    const result = await rateLimit(`${ip}:${url.pathname}`, limit, duration);

    if (!result.allowed) {
        return new Response(JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Please try again later.",
            reset: new Date(result.reset * 1000).toISOString()
        }), {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": result.reset.toString()
            }
        });
    }

    return null;
}
