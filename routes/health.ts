import { getMongoDb } from '../utils/mongoClient';
import { getRedisClient } from '../utils/redisClient';

async function checkMongo(): Promise<'healthy' | 'unhealthy'> {
  try {
    const db = getMongoDb();
    await db.command({ ping: 1 });
    return 'healthy';
  } catch {
    return 'unhealthy';
  }
}

async function checkRedis(): Promise<'healthy' | 'unhealthy'> {
  try {
    const client = getRedisClient();
    if (!client) return 'unhealthy';
    await client.ping();
    return 'healthy';
  } catch {
    return 'unhealthy';
  }
}

export async function healthHandler(_req: Request): Promise<Response> {
  const [mongodb, redis] = await Promise.all([checkMongo(), checkRedis()]);

  const checks = {
    status: mongodb === 'healthy' ? 'ok' : 'degraded',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    services: { mongodb, redis },
  };

  const allHealthy = mongodb === 'healthy';
  return Response.json(checks, { status: allHealthy ? 200 : 503 });
}

export async function readyHandler(_req: Request): Promise<Response> {
  const [mongodb, redis] = await Promise.all([checkMongo(), checkRedis()]);
  const ready = mongodb === 'healthy' && redis === 'healthy';
  return Response.json(
    { ready, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503 }
  );
}

export async function metricsHandler(_req: Request): Promise<Response> {
  // Prometheus text format
  const uptime = Math.round(process.uptime());
  const memUsage = process.memoryUsage();

  const metrics = [
    `# HELP reckruit_uptime_seconds Server uptime in seconds`,
    `# TYPE reckruit_uptime_seconds gauge`,
    `reckruit_uptime_seconds ${uptime}`,
    ``,
    `# HELP reckruit_memory_heap_used_bytes Heap memory used`,
    `# TYPE reckruit_memory_heap_used_bytes gauge`,
    `reckruit_memory_heap_used_bytes ${memUsage.heapUsed}`,
    ``,
    `# HELP reckruit_memory_heap_total_bytes Heap memory total`,
    `# TYPE reckruit_memory_heap_total_bytes gauge`,
    `reckruit_memory_heap_total_bytes ${memUsage.heapTotal}`,
  ].join('\n');

  return new Response(metrics, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
}
