/**
 * In-Memory Sliding-Window Rate Limiter
 * 
 * Provides application-layer rate limiting defense-in-depth against
 * brute-force credential attacks and request floods on sensitive endpoints.
 * Operates with zero external dependencies (no Redis required).
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Global store to persist across requests in Node runtime
const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitRecord>;
};

const store: Map<string, RateLimitRecord> =
  globalStore.__rateLimitStore ?? new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== "production") {
  globalStore.__rateLimitStore = store;
}

// Clean up stale entries every 5 minutes to avoid memory leaks
let lastCleanup = Date.now();
function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return; // Only run once every 5 minutes
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks and records an access attempt against a sliding time window.
 *
 * @param key Unique key for the rate limit subject (e.g. IP + route prefix)
 * @param limit Maximum allowed requests within the window
 * @param windowMs Duration of the sliding window in milliseconds (default: 60,000ms = 1 min)
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60_000
): RateLimitResult {
  cleanupStaleEntries(windowMs);

  const now = Date.now();
  const record = store.get(key) || { timestamps: [] };

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Record current request timestamp
  record.timestamps.push(now);
  store.set(key, record);

  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Extracts client IP address from standard proxy headers or fallback.
 */
export function getClientIp(req: Request): string {
  // 1. Cloudflare edge header
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // 2. Standard reverse proxy header (take the first client IP)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 3. Nginx / AWS ALB direct client IP header
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // 4. Default fallback for local testing
  return "127.0.0.1";
}
