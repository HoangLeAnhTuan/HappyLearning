import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Global in-memory cache for IP rate limiting
const ipRateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean expired rate limit entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of ipRateLimitStore.entries()) {
      if (now > value.resetTime) {
        ipRateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref timer so it doesn't block Node.js process exit during tests
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Unique key prefix for this endpoint (e.g. "auth_login", "verify_code") */
  prefix: string;
}

export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
} {
  const ip = getClientIp(req);
  const key = `${options.prefix}:${ip}`;
  const now = Date.now();

  const record = ipRateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New or expired window
    ipRateLimitStore.set(key, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetInSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  // Window active
  if (record.count >= options.limit) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    resetInSeconds,
  };
}
