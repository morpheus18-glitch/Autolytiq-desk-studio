/**
 * Rate limiting utilities (in-memory)
 *
 * Provides client-side rate limit checking for abuse prevention.
 * Uses in-memory store for tracking rate limit attempts.
 */

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Internal rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for user action
 * @param userId User ID
 * @param action Action being rate limited (e.g., 'send', 'read', 'delete')
 * @param limits Limit configuration { maxAttempts, windowMs }
 * @returns Rate limit check result
 */
export function checkRateLimit(
  userId: string,
  action: string,
  limits: { maxAttempts: number; windowMs: number }
): RateLimitResult {
  const key = `${userId}:${action}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);
  const resetTime = entry?.resetTime || now + limits.windowMs;

  if (!entry || now > resetTime) {
    // Reset or create new entry
    const newResetTime = now + limits.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime: newResetTime,
    });
    return {
      allowed: true,
      remaining: limits.maxAttempts - 1,
      resetAt: new Date(newResetTime),
    };
  }

  if (entry.count >= limits.maxAttempts) {
    const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(resetTime),
      retryAfter: retryAfterSeconds,
    };
  }

  entry.count++;
  const remaining = limits.maxAttempts - entry.count;

  return {
    allowed: true,
    remaining,
    resetAt: new Date(resetTime),
  };
}

/**
 * Clear rate limit cache for user
 * @param userId User ID
 * @param action Optional specific action to clear
 */
export function clearRateLimit(userId: string, action?: string): void {
  if (action) {
    rateLimitStore.delete(`${userId}:${action}`);
  } else {
    // Clear all actions for this user
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${userId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  }
}
