import IORedis from "ioredis";

const globalForRedis = globalThis as typeof globalThis & { __generatorStoreRedis?: IORedis };

/**
 * Railway exposes REDIS_URL for a private Redis service. The client is created
 * lazily so local development and preview builds work without Redis.
 */
export function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (globalForRedis.__generatorStoreRedis) return globalForRedis.__generatorStoreRedis;

  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (attempt) => Math.min(1_000 * attempt, 10_000),
  });
  client.on("error", (error) => console.error("Redis connection error", error.message));
  globalForRedis.__generatorStoreRedis = client;
  return client;
}

export async function ensureRedisConnection(redis: IORedis) {
  if (redis.status === "wait") await redis.connect();
  return redis;
}

/** Plain connection options avoid sharing an ioredis instance across packages. */
export function getBullMqConnection() {
  const value = process.env.REDIS_URL;
  if (!value) return null;
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: decodeURIComponent(url.username) || undefined,
    password: decodeURIComponent(url.password) || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...(url.protocol === "rediss:" ? { tls: { servername: url.hostname } } : {}),
  };
}
