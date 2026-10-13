/**
 * Shared HTTP for the scholarly APIs: one place for the identifying User-Agent, timeouts, and the
 * rate-limit handling that both OpenAlex and Semantic Scholar need.
 */
export class SourceRateLimitError extends Error {
  constructor(
    readonly source: string,
    readonly retryAfterSeconds: number,
    readonly detail: string,
  ) {
    super(`${source} rate limited: ${detail}`);
    this.name = "SourceRateLimitError";
  }
}

export class SourceRequestError extends Error {
  constructor(
    readonly source: string,
    readonly status: number,
    readonly detail: string,
  ) {
    super(`${source} returned ${status}: ${detail}`);
    this.name = "SourceRequestError";
  }
}

export interface FetchOptions {
  source: string;
  url: string;
  userAgent: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Reads the retry delay from either the body's `retryAfter` or the standard header. */
export function retryAfterSeconds(body: unknown, headers: Headers): number {
  if (body !== null && typeof body === "object" && "retryAfter" in body) {
    const value = (body as { retryAfter?: unknown }).retryAfter;
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  }
  const header = headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds));
  }
  return 60 * 60;
}

export async function fetchJson<T = unknown>(options: FetchOptions): Promise<T> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  try {
    const response = await doFetch(options.url, {
      headers: { "User-Agent": options.userAgent, Accept: "application/json" },
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (response.status === 429) {
      const detail =
        body !== null && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message)
          : text.slice(0, 200);
      throw new SourceRateLimitError(
        options.source,
        retryAfterSeconds(body, response.headers),
        detail,
      );
    }

    if (!response.ok) {
      throw new SourceRequestError(options.source, response.status, text.slice(0, 200));
    }

    return body as T;
  } finally {
    clearTimeout(timer);
  }
}
