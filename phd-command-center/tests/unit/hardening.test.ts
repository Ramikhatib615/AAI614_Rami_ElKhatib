import { describe, expect, it } from "vitest";

import { SlidingWindowLimiter, rateLimitResponse } from "@/lib/rate-limit";

describe("rate limiting", () => {
  it("allows up to the limit inside the window", () => {
    const limiter = new SlidingWindowLimiter(3, 60_000);
    const now = 1_000_000;
    expect(limiter.check("rami", now).ok).toBe(true);
    expect(limiter.check("rami", now + 1).ok).toBe(true);
    expect(limiter.check("rami", now + 2).ok).toBe(true);
    expect(limiter.check("rami", now + 3).ok).toBe(false);
  });

  it("tells the caller when to come back", () => {
    const limiter = new SlidingWindowLimiter(1, 60_000);
    const now = 1_000_000;
    limiter.check("rami", now);
    const blocked = limiter.check("rami", now + 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it("lets the window slide", () => {
    const limiter = new SlidingWindowLimiter(1, 60_000);
    const now = 1_000_000;
    limiter.check("rami", now);
    expect(limiter.check("rami", now + 61_000).ok).toBe(true);
  });

  it("keeps callers separate", () => {
    const limiter = new SlidingWindowLimiter(1, 60_000);
    const now = 1_000_000;
    expect(limiter.check("a", now).ok).toBe(true);
    expect(limiter.check("b", now).ok).toBe(true);
  });

  it("does not grow without bound", () => {
    const limiter = new SlidingWindowLimiter(5, 1_000);
    for (let i = 0; i < 500; i += 1) limiter.check(`caller-${i}`, 1_000_000);
    limiter.sweep(1_000_000 + 5_000);
    // Everything aged out, so a fresh caller still gets the full allowance.
    expect(limiter.check("caller-1", 1_000_000 + 5_000).remaining).toBe(4);
  });

  it("answers 429 with a Retry-After header", async () => {
    const response = rateLimitResponse({ ok: false, remaining: 0, retryAfterSeconds: 42 });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(await response.json()).toMatchObject({ error: "rate_limited" });
  });
});
