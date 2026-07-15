import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureRedisConnection, getRedis } from "@/lib/redis";

type LimitEntry = { count: number; resetAt: number };
type RateLimitOptions = { bucket: string; limit: number; windowMs: number; identifier?: string };

const globalForRateLimit = globalThis as typeof globalThis & { __generatorStoreRateLimits?: Map<string, LimitEntry> };
const memoryStore = globalForRateLimit.__generatorStoreRateLimits ?? new Map<string, LimitEntry>();
globalForRateLimit.__generatorStoreRateLimits = memoryStore;

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

function rateKey(req: NextRequest, options: RateLimitOptions) {
  // Do not put raw e-mail/IP data into Redis keys.
  const identity = options.identifier ?? clientIp(req);
  const fingerprint = createHash("sha256").update(`${options.bucket}:${identity}`).digest("hex").slice(0, 32);
  return `gs:ratelimit:${options.bucket}:${fingerprint}`;
}

function blockedResponse(retryAfter: number, limit: number, remaining = 0) {
  return NextResponse.json(
    { error: "Слишком много запросов. Повторите попытку позже." },
    { status: 429, headers: { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(limit), "X-RateLimit-Remaining": String(Math.max(0, remaining)) } }
  );
}

function memoryRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const current = memoryStore.get(key);
  let entry: LimitEntry;
  if (!current || current.resetAt <= now) {
    entry = { count: 1, resetAt: now + options.windowMs };
    memoryStore.set(key, entry);
  } else {
    current.count += 1;
    entry = current;
  }
  if (memoryStore.size > 10_000) for (const [storedKey, stored] of memoryStore) if (stored.resetAt <= now) memoryStore.delete(storedKey);
  if (entry.count > options.limit) return blockedResponse(Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)), options.limit);
  return null;
}

/**
 * Distributed fixed-window limiter backed by Railway Redis. A controlled
 * in-memory fallback preserves local development and avoids turning a Redis
 * outage into a storefront outage; production should alert on the fallback.
 */
export async function rateLimit(req: NextRequest, options: RateLimitOptions): Promise<NextResponse | null> {
  const key = rateKey(req, options);
  const redis = getRedis();
  if (!redis) return memoryRateLimit(key, options);

  try {
    await ensureRedisConnection(redis);
    const [count, ttl] = await redis.eval(
      "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return { current, redis.call('PTTL', KEYS[1]) };",
      1,
      key,
      options.windowMs
    ) as [number, number];
    if (count > options.limit) return blockedResponse(Math.max(1, Math.ceil(ttl / 1_000)), options.limit);
    return null;
  } catch (error) {
    console.error("Redis rate limiter fallback", error);
    return memoryRateLimit(key, options);
  }
}
