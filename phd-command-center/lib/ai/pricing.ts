/**
 * Prices per million tokens, from platform.claude.com/docs/en/about-claude/pricing
 * (fetched 12 September 2026). Kept in one table so a price change is a one-line edit.
 *
 * Web search is billed at $10 per 1,000 searches; a search that errors is not billed. Web fetch
 * costs nothing beyond the tokens the fetched page adds to the conversation.
 */
export interface ModelPrice {
  input: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
  output: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-opus-5": { input: 5, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5, output: 25 },
  "claude-sonnet-5": { input: 2, cacheWrite5m: 2.5, cacheWrite1h: 4, cacheRead: 0.2, output: 10 },
  "claude-haiku-4-5": { input: 1, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1, output: 5 },
};

export const WEB_SEARCH_USD_PER_1000 = 10;

export interface UsageCounts {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  searchCount: number;
}

export class UnknownModelError extends Error {
  constructor(readonly model: string) {
    super(
      `No price on file for "${model}". Add it to MODEL_PRICES before using it, so spend is never guessed.`,
    );
    this.name = "UnknownModelError";
  }
}

/**
 * Cost of one call in USD. Cache writes are priced at the 5-minute rate, which is the only TTL
 * this app uses; if a 1-hour breakpoint is ever added, pass the rate explicitly.
 */
export function estimateCostUsd(model: string, usage: UsageCounts): number {
  const price = MODEL_PRICES[model];
  if (!price) throw new UnknownModelError(model);

  const perToken = (tokens: number, rate: number): number => (tokens / 1_000_000) * rate;

  return (
    perToken(usage.inputTokens, price.input) +
    perToken(usage.outputTokens, price.output) +
    perToken(usage.cacheReadTokens, price.cacheRead) +
    perToken(usage.cacheWriteTokens, price.cacheWrite5m) +
    (usage.searchCount / 1000) * WEB_SEARCH_USD_PER_1000
  );
}

/** Reads the SDK's usage object into our counts, tolerating fields the API may omit. */
export function readUsage(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}): UsageCounts {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    searchCount: usage.server_tool_use?.web_search_requests ?? 0,
  };
}
