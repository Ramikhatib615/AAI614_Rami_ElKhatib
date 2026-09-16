import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  BudgetExceededError,
  assertWithinBudget,
  monthStart,
  wouldExceedBudget,
} from "@/lib/ai/budget";
import { callStructured, callWithWebTools } from "@/lib/ai/invoke";
import { MODEL_PRICES, UnknownModelError, estimateCostUsd, readUsage } from "@/lib/ai/pricing";
import { webFetchTool, webSearchTool } from "@/lib/ai/tools";
import {
  collectServerToolErrors,
  type AiClient,
  type AiParsedResponse,
  type AiResponse,
} from "@/lib/ai/types";

const schema = z.object({ university: z.string(), deadline: z.string().nullable() });

const usage = (over: Partial<Record<string, number>> = {}) => ({
  input_tokens: over.input ?? 1000,
  output_tokens: over.output ?? 200,
  cache_read_input_tokens: over.cacheRead ?? 0,
  cache_creation_input_tokens: over.cacheWrite ?? 0,
  server_tool_use: { web_search_requests: over.searches ?? 0 },
});

function parsedResponse(over: Partial<AiParsedResponse>): AiParsedResponse {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text: "{}" }],
    usage: usage(),
    parsed_output: null,
    ...over,
  };
}

function fakeClient(responses: {
  parse?: AiParsedResponse[];
  create?: AiResponse[];
}): AiClient & { parseCalls: number; createCalls: number; lastParseParams: unknown } {
  const state = { parseCalls: 0, createCalls: 0, lastParseParams: null as unknown };
  return {
    get parseCalls() {
      return state.parseCalls;
    },
    get createCalls() {
      return state.createCalls;
    },
    get lastParseParams() {
      return state.lastParseParams;
    },
    async parse(params) {
      state.lastParseParams = params;
      const next = responses.parse?.[state.parseCalls];
      state.parseCalls += 1;
      if (!next) throw new Error("fake client: no parse response queued");
      return next;
    },
    async create() {
      const next = responses.create?.[state.createCalls];
      state.createCalls += 1;
      if (!next) throw new Error("fake client: no create response queued");
      return next;
    },
  };
}

const budget = { spentUsd: 0, capUsd: 25 };

describe("pricing", () => {
  it("prices a call from the published per-million rates", () => {
    // 1M input + 1M output on Opus 5 is $5 + $25.
    const cost = estimateCostUsd("claude-opus-5", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      searchCount: 0,
    });
    expect(cost).toBeCloseTo(30, 6);
  });

  it("prices cache reads and writes separately from fresh input", () => {
    const cost = estimateCostUsd("claude-sonnet-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
      searchCount: 0,
    });
    // Sonnet 5: cache read $0.20, 5-minute cache write $2.50.
    expect(cost).toBeCloseTo(2.7, 6);
  });

  it("charges web searches at ten dollars per thousand", () => {
    const cost = estimateCostUsd("claude-haiku-4-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      searchCount: 250,
    });
    expect(cost).toBeCloseTo(2.5, 6);
  });

  it("refuses to price a model it has no rate for, rather than guessing", () => {
    expect(() =>
      estimateCostUsd("claude-imaginary-9", {
        inputTokens: 1,
        outputTokens: 1,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        searchCount: 0,
      }),
    ).toThrow(UnknownModelError);
  });

  it("prices every model the app is configured to use", () => {
    for (const model of ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"]) {
      expect(MODEL_PRICES[model]).toBeDefined();
    }
  });

  it("reads the SDK usage shape, including missing fields", () => {
    expect(readUsage({ input_tokens: 5 })).toEqual({
      inputTokens: 5,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      searchCount: 0,
    });
  });
});

describe("the budget cap", () => {
  it("stops work once the month's spend reaches the cap", () => {
    expect(() => assertWithinBudget(25.01, 25)).toThrow(BudgetExceededError);
    expect(() => assertWithinBudget(24.99, 25)).not.toThrow();
  });

  it("refuses a call whose projected cost would cross the cap", () => {
    const projected = {
      inputTokens: 200_000,
      outputTokens: 100_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      searchCount: 0,
    };
    expect(wouldExceedBudget(24, 25, "claude-opus-5", projected)).toBe(true);
    expect(wouldExceedBudget(0, 25, "claude-opus-5", projected)).toBe(false);
  });

  it("counts from the first of the current UTC month", () => {
    const start = monthStart(new Date("2026-09-12T09:30:00Z"));
    expect(start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("never reaches the API when the cap is already spent", async () => {
    const client = fakeClient({ parse: [] });
    await expect(
      callStructured(
        { client, model: "claude-sonnet-5", purpose: "test", budget: { spentUsd: 30, capUsd: 25 } },
        { schema, outputFormat: {}, messages: [{ role: "user", content: "go" }] },
      ),
    ).rejects.toThrow(BudgetExceededError);
    expect(client.parseCalls).toBe(0);
  });
});

describe("structured output", () => {
  it("returns validated data and logs usage on success", async () => {
    const client = fakeClient({
      parse: [
        parsedResponse({ parsed_output: { university: "ELLIS Finland", deadline: "2026-09-21" } }),
      ],
    });
    const onUsage = vi.fn();

    const result = await callStructured(
      { client, model: "claude-sonnet-5", purpose: "test", budget, onUsage },
      { schema, outputFormat: {}, messages: [{ role: "user", content: "extract" }] },
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.university).toBe("ELLIS Finland");
    expect(client.parseCalls).toBe(1);
    expect(onUsage).toHaveBeenCalledOnce();
    expect(onUsage.mock.calls[0][0].costUsd).toBeGreaterThan(0);
  });

  it("retries once with the validation error, then succeeds", async () => {
    const client = fakeClient({
      parse: [
        parsedResponse({ parsed_output: { university: 42 } }),
        parsedResponse({ parsed_output: { university: "IMPRS-IS", deadline: null } }),
      ],
    });

    const result = await callStructured(
      { client, model: "claude-sonnet-5", purpose: "test", budget },
      { schema, outputFormat: {}, messages: [{ role: "user", content: "extract" }] },
    );

    expect(client.parseCalls).toBe(2);
    expect(result.status).toBe("ok");
    // The retry carries the schema error, and says to leave a field null rather than guess.
    const params = client.lastParseParams as { messages: { role: string; content: string }[] };
    const retryPrompt = params.messages.at(-1)?.content ?? "";
    expect(retryPrompt).toContain("did not match the required schema");
    expect(retryPrompt).toContain("null rather than guessing");
  });

  it("marks the record needs_review after a second failure instead of writing a guess", async () => {
    const client = fakeClient({
      parse: [
        parsedResponse({ parsed_output: {} }),
        parsedResponse({ parsed_output: { university: null } }),
      ],
    });

    const result = await callStructured(
      { client, model: "claude-sonnet-5", purpose: "test", budget },
      { schema, outputFormat: {}, messages: [{ role: "user", content: "extract" }] },
    );

    expect(client.parseCalls).toBe(2);
    expect(result.status).toBe("needs_review");
    if (result.status !== "needs_review") return;
    expect(result.reason).toContain("failed schema validation twice");
    // Usage from both attempts is still accounted for.
    expect(result.usage.inputTokens).toBe(2000);
  });

  it("treats a refusal as needs_review rather than an exception", async () => {
    const client = fakeClient({
      parse: [
        parsedResponse({
          stop_reason: "refusal",
          stop_details: { category: "cyber", explanation: "declined" },
          parsed_output: null,
        }),
      ],
    });

    const result = await callStructured(
      { client, model: "claude-opus-5", purpose: "test", budget },
      { schema, outputFormat: {}, messages: [{ role: "user", content: "extract" }] },
    );

    expect(result.status).toBe("needs_review");
    if (result.status !== "needs_review") return;
    expect(result.reason).toContain("cyber");
    expect(client.parseCalls).toBe(1);
  });
});

describe("web search and fetch", () => {
  it("declares the dynamic-filtering tool versions", () => {
    expect(webSearchTool({ maxUses: 3 }).type).toBe("web_search_20260209");
    expect(webFetchTool({ maxUses: 2 }).type).toBe("web_fetch_20260209");
    // Domain narrowing is only sent when asked for.
    expect(webSearchTool({ maxUses: 3 })).not.toHaveProperty("allowed_domains");
    expect(webSearchTool({ maxUses: 3, allowedDomains: ["ellis.eu"] }).allowed_domains).toEqual([
      "ellis.eu",
    ]);
    // A page cap, because one fetched PDF can otherwise cost more than the whole job.
    expect(webFetchTool({ maxUses: 2 }).max_content_tokens).toBe(20_000);
  });

  it("detects a search error inside a 200 response instead of indexing into it", () => {
    const errors = collectServerToolErrors([
      { type: "web_search_tool_result", content: { error_code: "max_uses_exceeded" } },
      { type: "web_search_tool_result", content: [{ title: "a result" }] },
      { type: "text", text: "hello" },
    ]);
    expect(errors).toEqual(["max_uses_exceeded"]);
  });

  it("reports search errors from a completed research turn", async () => {
    const client = fakeClient({
      create: [
        {
          stop_reason: "end_turn",
          content: [
            { type: "web_search_tool_result", content: { error_code: "unavailable" } },
            { type: "text", text: "I could not search." },
          ],
          usage: usage({ searches: 0 }),
        },
      ],
    });

    const result = await callWithWebTools(
      { client, model: "claude-sonnet-5", purpose: "test", budget },
      { max_tokens: 1000, messages: [{ role: "user", content: "find" }] },
    );

    expect(result.searchErrors).toEqual(["unavailable"]);
    expect(result.truncated).toBe(false);
  });

  it("resumes a paused turn and accumulates usage across both halves", async () => {
    const client = fakeClient({
      create: [
        {
          stop_reason: "pause_turn",
          content: [{ type: "text", text: "half" }],
          usage: usage({ searches: 2 }),
        },
        {
          stop_reason: "end_turn",
          content: [{ type: "text", text: "done" }],
          usage: usage({ searches: 1 }),
        },
      ],
    });

    const result = await callWithWebTools(
      { client, model: "claude-sonnet-5", purpose: "test", budget },
      { max_tokens: 1000, messages: [{ role: "user", content: "find" }] },
    );

    expect(client.createCalls).toBe(2);
    expect(result.text).toBe("done");
    expect(result.usage.searchCount).toBe(3);
    expect(result.truncated).toBe(false);
    expect(result.iterations).toBe(2);
  });

  it("flags a turn still paused at the iteration cap, so a partial answer is never trusted", async () => {
    const paused = {
      stop_reason: "pause_turn",
      content: [{ type: "text", text: "still going" }],
      usage: usage(),
    };
    const client = fakeClient({ create: [paused, paused] });

    const result = await callWithWebTools(
      { client, model: "claude-sonnet-5", purpose: "test", budget },
      { max_tokens: 1000, messages: [{ role: "user", content: "find" }], maxIterations: 2 },
    );

    expect(result.truncated).toBe(true);
    expect(result.iterations).toBe(2);
  });
});
