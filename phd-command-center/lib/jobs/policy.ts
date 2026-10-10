/**
 * Queue policy, kept pure so the retry and staleness rules are unit tested without a database.
 */
export const MAX_ATTEMPTS = 3;
/** A job whose lock is older than this is assumed dead and returned to the queue. */
export const STALE_LOCK_MS = 10 * 60 * 1000;
/** How long a worker invocation may run before it returns and leaves the rest queued. */
export const WORKER_BUDGET_MS = 240_000;

/** Exponential backoff: 2, 4, then 8 minutes. */
export function nextRunAfter(attempts: number, now: Date = new Date()): Date {
  const minutes = Math.pow(2, Math.max(1, attempts));
  return new Date(now.getTime() + minutes * 60_000);
}

export function shouldRetry(attempts: number, maxAttempts = MAX_ATTEMPTS): boolean {
  return attempts < maxAttempts;
}

export function isStale(lockedAt: Date | null, now: Date = new Date()): boolean {
  if (!lockedAt) return false;
  return now.getTime() - lockedAt.getTime() > STALE_LOCK_MS;
}

export function hasTimeLeft(
  startedAt: number,
  now: number = Date.now(),
  budgetMs = WORKER_BUDGET_MS,
): boolean {
  return now - startedAt < budgetMs;
}

export function progressFor(step: number, totalSteps: number | null): number {
  if (!totalSteps || totalSteps <= 0) return 0;
  return Math.min(1, step / totalSteps);
}
