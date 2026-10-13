import "server-only";

import { randomUUID } from "node:crypto";

import { hasTimeLeft, progressFor, WORKER_BUDGET_MS } from "./policy";
import {
  claimNext,
  enqueue,
  markContinued,
  markFailedOrRetry,
  markPaused,
  markSucceeded,
  requeueStale,
} from "./queue";
import type { JobHandlerRegistry, JobType } from "./types";

export interface DrainSummary {
  workerId: string;
  claimed: number;
  succeeded: number;
  continued: number;
  paused: number;
  failed: number;
  requeuedStale: number;
  timedOut: boolean;
  errors: string[];
}

/**
 * Runs queued work until the queue is empty or the time budget runs out, then returns and leaves
 * the rest queued (PROMPT.md §3.2). On Vercel's Hobby plan cron only fires once a day, so this is
 * normally driven by the dashboard's "Run queue" button; the cron route calls the same function.
 */
export async function drainQueue(
  handlers: JobHandlerRegistry,
  options: { budgetMs?: number; workerId?: string } = {},
): Promise<DrainSummary> {
  const workerId = options.workerId ?? `worker-${randomUUID().slice(0, 8)}`;
  const budgetMs = options.budgetMs ?? WORKER_BUDGET_MS;
  const startedAt = Date.now();

  const summary: DrainSummary = {
    workerId,
    claimed: 0,
    succeeded: 0,
    continued: 0,
    paused: 0,
    failed: 0,
    requeuedStale: await requeueStale(),
    timedOut: false,
    errors: [],
  };

  while (hasTimeLeft(startedAt, Date.now(), budgetMs)) {
    const job = await claimNext(workerId);
    if (!job) return summary;
    summary.claimed += 1;

    const handler = handlers[job.type as JobType];
    if (!handler) {
      summary.failed += 1;
      summary.errors.push(`${job.type}: no handler registered`);
      await markFailedOrRetry(
        job.id,
        job.maxAttempts,
        job.maxAttempts,
        `No handler for "${job.type}".`,
      );
      continue;
    }

    try {
      const result = await handler({
        job,
        enqueue: async (input) => {
          await enqueue({ ...input, parentJobId: job.id });
        },
      });

      if (result.status === "done") {
        await markSucceeded(job.id, result.result);
        summary.succeeded += 1;
      } else if (result.status === "paused") {
        await markPaused(job.id, result.reason);
        summary.paused += 1;
      } else {
        const step = result.step ?? job.step + 1;
        const totalSteps = result.totalSteps ?? job.totalSteps;
        for (const child of result.children ?? []) {
          await enqueue({ ...child, parentJobId: job.id });
        }
        await markContinued(job.id, {
          step,
          ...(result.totalSteps === undefined ? {} : { totalSteps: result.totalSteps }),
          progress: progressFor(step, totalSteps),
          ...(result.payload === undefined ? {} : { payload: result.payload }),
        });
        summary.continued += 1;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const outcome = await markFailedOrRetry(job.id, job.attempts, job.maxAttempts, message);
      summary.errors.push(`${job.type}: ${message}`);
      if (outcome === "failed") summary.failed += 1;
    }
  }

  summary.timedOut = true;
  return summary;
}
