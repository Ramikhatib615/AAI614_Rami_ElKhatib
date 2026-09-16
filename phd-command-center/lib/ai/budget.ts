import { estimateCostUsd, type UsageCounts } from "./pricing";

export class BudgetExceededError extends Error {
  constructor(
    readonly spentUsd: number,
    readonly capUsd: number,
  ) {
    super(
      `This month's AI spend is $${spentUsd.toFixed(2)} against a cap of $${capUsd.toFixed(2)}. ` +
        "The job is paused rather than dropped; raise AI_MONTHLY_BUDGET_USD or wait for the month to roll over.",
    );
    this.name = "BudgetExceededError";
  }
}

/**
 * Checked before every model call (PROMPT.md §3.1). The cap is a hard stop: work pauses and is
 * visible in the dashboard, never silently dropped and never silently overspent.
 */
export function assertWithinBudget(spentUsd: number, capUsd: number): void {
  if (spentUsd >= capUsd) throw new BudgetExceededError(spentUsd, capUsd);
}

/**
 * A conservative pre-flight estimate, so a single large call cannot blow far past the cap between
 * one check and the next.
 */
export function wouldExceedBudget(
  spentUsd: number,
  capUsd: number,
  model: string,
  projected: UsageCounts,
): boolean {
  return spentUsd + estimateCostUsd(model, projected) > capUsd;
}

/** First moment of the current UTC month, the window the cap applies to. */
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
