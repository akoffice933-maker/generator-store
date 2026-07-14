import { NextRequest, NextResponse } from "next/server";

type LimitEntry = { count: number; resetAt: number };

type RateLimitOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
  identifier?: string;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __generatorStoreRateLimits?: Map<string, LimitEntry>;
};

const store = globalForRateLimit.__generatorStoreRateLimits ?? new Map<string, LimitEntry>();
globalForRateLimit.__generatorStoreRateLimits = store;

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Small in-process safety net for local/single-instance deployment.
 * Use a shared Redis/edge limiter before horizontally scaling the application.
 */
export function rateLimit(req: NextRequest, options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const key = `${options.bucket}:${options.identifier ?? clientIp(req)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
  } else {
    current.count += 1;
    if (current.count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите попытку позже." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
  }

  // Avoid retaining expired buckets forever in long-running single instances.
  if (store.size > 10_000) {
    for (const [storedKey, entry] of store) {
      if (entry.resetAt <= now) store.delete(storedKey);
    }
  }

  return null;
}
