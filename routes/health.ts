import { getMongoDb } from "../utils/mongoClient";
import { getRedisClient } from "../utils/redisClient";
import { autoRoutedChatCompletion } from "../services/llmRouter";

/**
 * Check MongoDB health
 */
async function checkMongo(): Promise<string> {
    try {
        const db = getMongoDb();
        await db.command({ ping: 1 });
        return "healthy";
    } catch (error) {
        console.error("[Health] MongoDB unheathy:", error);
        return "unhealthy";
    }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<string> {
    try {
        const client = getRedisClient();
        if (!client) return "unhealthy";
        await client.ping();
        return "healthy";
    } catch (error) {
        console.error("[Health] Redis unheathy:", error);
        return "unhealthy";
    }
}

/**
 * Check LLM availability
 */
async function checkLLM(): Promise<string> {
    try {
        // Simple fast ping to check connectivity
        // Using a very low token limit and simple prompt
        await autoRoutedChatCompletion("You are a health check system.", "ping", { 
            max_tokens: 5,
            temperature: 0
        });
        return "healthy";
    } catch (error) {
        console.error("[Health] LLM unreachable:", error);
        return "unhealthy";
    }
}

/**
 * GET /health
 */
export async function healthHandler(_req: Request): Promise<Response> {
    const start = Date.now();
    
    // Check services in parallel
    const [mongo, redis, llm] = await Promise.all([
        checkMongo(),
        checkRedis(),
        checkLLM()
    ]);

    const checks = {
        status: mongo === "healthy" && redis === "healthy" && llm === "healthy" ? "ok" : "degraded",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - start,
        services: {
            mongodb: mongo,
            redis: redis,
            llm: llm
        }
    };

    const allHealthy = checks.status === "ok";
    return new Response(JSON.stringify(checks), { 
        status: allHealthy ? 200 : 503,
        headers: { "Content-Type": "application/json" }
    });
}

/**
 * GET /ready
 */
export async function readyHandler(_req: Request): Promise<Response> {
    const mongo = await checkMongo();
    const redis = await checkRedis();
    
    // Readiness only depends on critical infra (Mongo & Redis)
    const isReady = mongo === "healthy" && redis === "healthy";
    
    return new Response(isReady ? "READY" : "NOT_READY", {
        status: isReady ? 200 : 503,
        headers: { "Content-Type": "text/plain" }
    });
}

/**
 * GET /metrics
 * Returns Prometheus text format metrics
 */
export async function metricsHandler(_req: Request): Promise<Response> {
    const mongo = await checkMongo();
    const redis = await checkRedis();
    
    // In a real system, these would come from prometheus client
    // For now, we return basic infrastructure health as metrics
    const metrics = [
        '# HELP reckruit_mongodb_status MongoDB health status (1 for healthy, 0 for unhealthy)',
        '# TYPE reckruit_mongodb_status gauge',
        `reckruit_mongodb_status ${mongo === "healthy" ? 1 : 0}`,
        '',
        '# HELP reckruit_redis_status Redis health status (1 for healthy, 0 for unhealthy)',
        '# TYPE reckruit_redis_status gauge',
        `reckruit_redis_status ${redis === "healthy" ? 1 : 0}`,
        '',
        '# HELP reckruit_version_info Application version info',
        '# TYPE reckruit_version_info gauge',
        'reckruit_version_info{version="1.0.0"} 1'
    ].join('\n');

    return new Response(metrics, {
        status: 200,
        headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" }
    });
}
