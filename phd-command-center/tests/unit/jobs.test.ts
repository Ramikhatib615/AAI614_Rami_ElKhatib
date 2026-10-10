import { describe, expect, it } from "vitest";

import {
  MAX_ATTEMPTS,
  hasTimeLeft,
  isStale,
  nextRunAfter,
  progressFor,
  shouldRetry,
} from "@/lib/jobs/policy";
import { enqueueSchema, jobTypeSchema } from "@/lib/jobs/types";

const NOW = new Date("2026-09-12T10:00:00Z");

describe("queue policy", () => {
  it("backs off exponentially between attempts", () => {
    expect(nextRunAfter(1, NOW).toISOString()).toBe("2026-09-12T10:02:00.000Z");
    expect(nextRunAfter(2, NOW).toISOString()).toBe("2026-09-12T10:04:00.000Z");
    expect(nextRunAfter(3, NOW).toISOString()).toBe("2026-09-12T10:08:00.000Z");
  });

  it("gives up after the attempt limit rather than looping forever", () => {
    expect(shouldRetry(1)).toBe(true);
    expect(shouldRetry(MAX_ATTEMPTS)).toBe(false);
  });

  it("treats a lock older than ten minutes as a dead worker", () => {
    expect(isStale(new Date("2026-09-12T09:58:00Z"), NOW)).toBe(false);
    expect(isStale(new Date("2026-09-12T09:45:00Z"), NOW)).toBe(true);
    expect(isStale(null, NOW)).toBe(false);
  });

  it("stops claiming work before the function's time budget runs out", () => {
    const started = NOW.getTime();
    expect(hasTimeLeft(started, started + 100_000)).toBe(true);
    expect(hasTimeLeft(started, started + 250_000)).toBe(false);
  });

  it("reports progress only when the total is known", () => {
    expect(progressFor(2, 8)).toBe(0.25);
    expect(progressFor(2, null)).toBe(0);
    expect(progressFor(12, 8)).toBe(1);
  });
});

describe("enqueue validation", () => {
  it("accepts a known job type and defaults the rest", () => {
    const parsed = enqueueSchema.parse({ type: "diagnostics.ping" });
    expect(parsed.payload).toEqual({});
    expect(parsed.priority).toBe(100);
  });

  it("rejects a job type with no handler contract", () => {
    expect(() => enqueueSchema.parse({ type: "delete.everything" })).toThrow();
  });

  it("names every job type the pipeline will need", () => {
    for (const type of [
      "program.extract",
      "professor.verify_page",
      "outreach.draft",
      "cv.tailor",
    ]) {
      expect(jobTypeSchema.safeParse(type).success).toBe(true);
    }
  });
});
