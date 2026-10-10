/**
 * Server-tool definitions.
 *
 * Version strings confirmed against the current docs on 12 September 2026: the dynamic-filtering
 * variants are `web_search_20260209` and `web_fetch_20260209`, and they run on the models this app
 * uses (Opus 5, Sonnet 5). PROMPT.md §3.1 cites `web_search_20250305` and a `web_search_20260318`;
 * the first is the older basic variant for pre-4.6 models and the second does not exist.
 *
 * Do not declare `code_execution` alongside these — the dynamic-filtering variants run code
 * execution internally, and a second environment confuses the model.
 */
export interface WebSearchOptions {
  maxUses: number;
  /** Narrow to one university's domain when extracting from a known page. */
  allowedDomains?: string[];
}

export function webSearchTool(options: WebSearchOptions): Record<string, unknown> {
  return {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: options.maxUses,
    ...(options.allowedDomains?.length ? { allowed_domains: options.allowedDomains } : {}),
  };
}

export function webFetchTool(options: {
  maxUses: number;
  allowedDomains?: string[];
  maxContentTokens?: number;
}): Record<string, unknown> {
  return {
    type: "web_fetch_20260209",
    name: "web_fetch",
    max_uses: options.maxUses,
    // Caps what one page can add to the conversation, which is the main cost risk in extraction.
    max_content_tokens: options.maxContentTokens ?? 20_000,
    ...(options.allowedDomains?.length ? { allowed_domains: options.allowedDomains } : {}),
  };
}
