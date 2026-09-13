/**
 * A sliding-window limiter for the endpoints that cost money.
 *
 * In-memory, so on Vercel it is per instance rather than global. That is honest rather than
 * ideal: it stops a stuck loop or a doubled click from spending, while the hard monthly cap in
 * lib/ai/budget.ts is what actually bounds spend. A shared store (Vercel KV) would make it global
 * and is the right upgrade if this ever runs on more than one instance at a time.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > cutoff);

    if (recent.length >= this.limit) {
      const oldest = recent[0];
      this.hits.set(key, recent);
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { ok: true, remaining: this.limit - recent.length, retryAfterSeconds: 0 };
  }

  /** Drops keys with no recent activity, so the map cannot grow without bound. */
  sweep(now: number = Date.now()): void {
    const cutoff = now - this.windowMs;
    for (const [key, times] of this.hits) {
      const recent = times.filter((time) => time > cutoff);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

/** Queueing work is cheap; draining it calls models, so it is limited harder. */
export const enqueueLimiter = new SlidingWindowLimiter(30, 60_000);
export const drainLimiter = new SlidingWindowLimiter(6, 60_000);

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      error: "rate_limited",
      message: `Too many requests. Try again in ${result.retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
