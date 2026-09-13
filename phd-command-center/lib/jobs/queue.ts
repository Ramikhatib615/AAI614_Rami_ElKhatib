import "server-only";

import { and, desc, eq, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { isStale, nextRunAfter, shouldRetry, STALE_LOCK_MS } from "./policy";
import { enqueueSchema, type EnqueueInput, type JobRecord } from "./types";

/**
 * Adds a job unless the same work is already queued or running. The unique partial index on
 * `dedupe_key` makes that a database guarantee rather than a race.
 */
export async function enqueue(input: EnqueueInput): Promise<string | null> {
  const parsed = enqueueSchema.parse(input);
  const [row] = await db()
    .insert(jobs)
    .values({
      type: parsed.type,
      payload: parsed.payload,
      dedupeKey: parsed.dedupeKey ?? null,
      priority: parsed.priority,
      runAfter: parsed.runAfter ?? new Date(),
      parentJobId: parsed.parentJobId ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: jobs.id });

  return row?.id ?? null;
}

/**
 * Claims one job for this worker. `FOR UPDATE SKIP LOCKED` means the cron worker and a
 * browser-triggered drain can run at the same time and never pick up the same row.
 */
export async function claimNext(workerId: string): Promise<JobRecord | null> {
  const claimed = await db().execute(sql`
    update ${jobs}
    set status = 'running', locked_at = now(), locked_by = ${workerId},
        attempts = ${jobs.attempts} + 1, updated_at = now()
    where id = (
      select id from ${jobs}
      where status = 'queued' and run_after <= now()
      order by priority asc, run_after asc
      for update skip locked
      limit 1
    )
    returning id, type, payload, step, total_steps, attempts, max_attempts
  `);

  const row = (claimed as unknown as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (!row) return null;

  return {
    id: String(row.id),
    type: String(row.type),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    step: Number(row.step ?? 0),
    totalSteps: row.total_steps === null ? null : Number(row.total_steps),
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? 3),
  };
}

export async function markSucceeded(id: string, result?: Record<string, unknown>): Promise<void> {
  await db()
    .update(jobs)
    .set({
      status: "succeeded",
      progress: 1,
      result: result ?? null,
      error: null,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id));
}

export async function markContinued(
  id: string,
  patch: { step: number; totalSteps?: number; progress: number; payload?: Record<string, unknown> },
): Promise<void> {
  await db()
    .update(jobs)
    .set({
      status: "queued",
      step: patch.step,
      ...(patch.totalSteps === undefined ? {} : { totalSteps: patch.totalSteps }),
      progress: patch.progress,
      ...(patch.payload === undefined ? {} : { payload: patch.payload }),
      lockedAt: null,
      lockedBy: null,
      runAfter: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id));
}

/** A paused job keeps its place and its reason — nothing is silently dropped. */
export async function markPaused(id: string, reason: string): Promise<void> {
  await db()
    .update(jobs)
    .set({ status: "paused", error: reason, lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(eq(jobs.id, id));
}

export async function markFailedOrRetry(
  id: string,
  attempts: number,
  maxAttempts: number,
  error: string,
): Promise<"retrying" | "failed"> {
  const retry = shouldRetry(attempts, maxAttempts);
  await db()
    .update(jobs)
    .set({
      status: retry ? "queued" : "failed",
      error,
      lockedAt: null,
      lockedBy: null,
      ...(retry ? { runAfter: nextRunAfter(attempts) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id));
  return retry ? "retrying" : "failed";
}

/** Returns jobs whose worker died mid-step back to the queue. */
export async function requeueStale(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_LOCK_MS);
  const rows = await db()
    .update(jobs)
    .set({ status: "queued", lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(and(eq(jobs.status, "running"), lt(jobs.lockedAt, cutoff)))
    .returning({ id: jobs.id });
  return rows.length;
}

export async function recentJobs(limit = 25) {
  return db().select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);
}

export { isStale };
