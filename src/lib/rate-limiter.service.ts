import pLimit from "p-limit";

import type { RateLimiterInterface } from "./openrouter.service";

/**
 * Configuration for rate limiter
 */
export interface RateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Whether to use per-user limits */
  perUser?: boolean;
  /** Global concurrency limit */
  concurrency?: number;
}

/**
 * Rate limit bucket for tracking requests
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Enhanced rate limiter with per-user and global limits
 * 
 * Features:
 * - Per-user rate limiting (sliding window)
 * - Global concurrency limiting
 * - Memory-based implementation (suitable for single instance)
 * - Automatic cleanup of expired buckets
 * 
 * For production with multiple instances, consider Redis-based implementation
 * using ioredis or Upstash.
 */
export class EnhancedRateLimiter implements RateLimiterInterface {
  private config: Required<RateLimiterConfig>;
  private buckets: Map<string, RateLimitBucket>;
  private globalLimiter: ReturnType<typeof pLimit>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      perUser: config.perUser ?? true,
      concurrency: config.concurrency ?? 10,
    };

    this.buckets = new Map();
    this.globalLimiter = pLimit(this.config.concurrency);
    this.cleanupInterval = null;

    // Start cleanup interval
    this._startCleanup();
  }

  /**
   * Acquire permission to make a request
   * 
   * @param key User ID or request identifier
   * @throws {Error} If rate limit is exceeded
   */
  async acquire(key: string): Promise<void> {
    // Check rate limit first (throw if exceeded)
    await this._checkRateLimit(key);

    // Then apply global concurrency limit
    await this.globalLimiter(() => Promise.resolve());
  }

  /**
   * Check if request is allowed under rate limit
   */
  private async _checkRateLimit(key: string): Promise<void> {
    if (!this.config.perUser) {
      // Global rate limiting only
      key = "global";
    }

    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Create or reset bucket if needed
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + this.config.windowMs,
      };
      this.buckets.set(key, bucket);
    }

    // Check if limit exceeded
    if (bucket.count >= this.config.maxRequests) {
      const resetInMs = bucket.resetAt - now;
      const resetInSeconds = Math.ceil(resetInMs / 1000);

      throw new Error(
        `Rate limit exceeded for key "${key}". ` +
          `Maximum ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s. ` +
          `Try again in ${resetInSeconds} seconds.`
      );
    }

    // Increment counter
    bucket.count++;
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(key: string): {
    remaining: number;
    limit: number;
    resetAt: number;
    resetInMs: number;
  } {
    if (!this.config.perUser) {
      key = "global";
    }

    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      return {
        remaining: this.config.maxRequests,
        limit: this.config.maxRequests,
        resetAt: now + this.config.windowMs,
        resetInMs: this.config.windowMs,
      };
    }

    return {
      remaining: Math.max(0, this.config.maxRequests - bucket.count),
      limit: this.config.maxRequests,
      resetAt: bucket.resetAt,
      resetInMs: bucket.resetAt - now,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    if (!this.config.perUser) {
      key = "global";
    }
    this.buckets.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.clear();
  }

  /**
   * Start periodic cleanup of expired buckets
   */
  private _startCleanup(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets.entries()) {
        if (now >= bucket.resetAt + this.config.windowMs) {
          this.buckets.delete(key);
        }
      }
    }, 60000);

    // Don't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup and clear resources
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}

/**
 * Factory function to create rate limiter based on environment
 */
export function createRateLimiter(
  environment: "development" | "production" = "development"
): EnhancedRateLimiter {
  if (environment === "production") {
    // Production: Stricter limits
    return new EnhancedRateLimiter({
      maxRequests: 100, // 100 requests
      windowMs: 60000, // per minute
      perUser: true,
      concurrency: 20,
    });
  }

  // Development: Lenient limits
  return new EnhancedRateLimiter({
    maxRequests: 1000, // 1000 requests
    windowMs: 60000, // per minute
    perUser: false, // global only
    concurrency: 50,
  });
}

