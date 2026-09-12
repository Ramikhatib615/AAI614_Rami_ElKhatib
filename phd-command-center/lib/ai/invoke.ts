import type { z } from "zod";

import { assertWithinBudget } from "./budget";
import { estimateCostUsd, readUsage, type UsageCounts } from "./pricing";
import {
  collectServerToolErrors,
  textOf,
  type AiClient,
  type AiContentBlock,
  type AiCreateParams,
  type AiMessage,
  type AiResponse,
} from "./types";

export interface SpendGate {
  /** Month-to-date spend in USD. */
  spentUsd: number;
  capUsd: number;
}

export interface InvokeContext {
  client: AiClient;
  model: string;
  purpose: string;
  budget: SpendGate;
  /** Called once per completed call so the caller can persist a usage row. */
  onUsage?: (usage: UsageCounts & { model: string; costUsd: number }) => Promise<void> | void;
}

function emptyUsage(): UsageCounts {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    searchCount: 0,
  };
}

function addUsage(total: UsageCounts, next: UsageCounts): UsageCounts {
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
    cacheReadTokens: total.cacheReadTokens + next.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + next.cacheWriteTokens,
    searchCount: total.searchCount + next.searchCount,
  };
}

async function settle(context: InvokeContext, usage: UsageCounts): Promise<number> {
  const costUsd = estimateCostUsd(context.model, usage);
  await context.onUsage?.({ ...usage, model: context.model, costUsd });
  return costUsd;
}

export type StructuredResult<T> =
  | { status: "ok"; data: T; usage: UsageCounts; costUsd: number; searchErrors: string[] }
  | {
      status: "needs_review";
      reason: string;
      rawText: string;
      usage: UsageCounts;
      costUsd: number;
      searchErrors: string[];
    };

export interface StructuredOptions<T> {
  schema: z.ZodType<T>;
  /** Built with `zodOutputFormat(schema)` by the caller, so this module stays SDK-agnostic. */
  outputFormat: unknown;
  system?: unknown;
  messages: AiMessage[];
  maxTokens?: number;
  tools?: unknown[];
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
}

/**
 * A structured call with exactly one retry (PROMPT.md §3.1): if the model's JSON does not satisfy
 * the schema, it is asked again with the validation error, and a second failure marks the record
 * `needs_review` rather than writing something unverified into the database.
 */
export async function callStructured<T>(
  context: InvokeContext,
  options: StructuredOptions<T>,
): Promise<StructuredResult<T>> {
  assertWithinBudget(context.budget.spentUsd, context.budget.capUsd);

  const messages: AiMessage[] = [...options.messages];
  let usage = emptyUsage();
  const searchErrors: string[] = [];
  let lastText = "";
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await context.client.parse({
      model: context.model,
      max_tokens: options.maxTokens ?? 8000,
      ...(options.system === undefined ? {} : { system: options.system }),
      messages,
      ...(options.tools ? { tools: options.tools } : {}),
      output_config: {
        format: options.outputFormat,
        ...(options.effort ? { effort: options.effort } : {}),
      },
    });

    usage = addUsage(usage, readUsage(response.usage));
    searchErrors.push(...collectServerToolErrors(response.content));
    lastText = textOf(response.content);

    if (response.stop_reason === "refusal") {
      const costUsd = await settle(context, usage);
      return {
        status: "needs_review",
        reason: `The model declined this request (${response.stop_details?.category ?? "no category"}).`,
        rawText: lastText,
        usage,
        costUsd,
        searchErrors,
      };
    }

    const parsed = options.schema.safeParse(response.parsed_output);
    if (parsed.success) {
      const costUsd = await settle(context, usage);
      return { status: "ok", data: parsed.data, usage, costUsd, searchErrors };
    }

    lastError = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");

    messages.push(
      { role: "assistant", content: lastText || "(no text)" },
      {
        role: "user",
        content: `That response did not match the required schema: ${lastError}. Return the corrected JSON only. Leave a field null rather than guessing at a value.`,
      },
    );
  }

  const costUsd = await settle(context, usage);
  return {
    status: "needs_review",
    reason: `The model's output failed schema validation twice. Last error: ${lastError}`,
    rawText: lastText,
    usage,
    costUsd,
    searchErrors,
  };
}

export interface ResearchResult {
  text: string;
  content: AiContentBlock[];
  usage: UsageCounts;
  costUsd: number;
  searchErrors: string[];
  /** True when the turn was still paused after the iteration cap — the answer may be partial. */
  truncated: boolean;
  iterations: number;
}

/**
 * A server-tool turn (web search and fetch).
 *
 * Two things the API does here surprise people, and both are handled: a long turn can stop with
 * `stop_reason: "pause_turn"`, which must be resumed by pushing the paused assistant turn back, and
 * a failed search returns HTTP 200 with the error inside the content block rather than throwing.
 */
export async function callWithWebTools(
  context: InvokeContext,
  params: Omit<AiCreateParams, "model"> & { maxIterations?: number },
): Promise<ResearchResult> {
  assertWithinBudget(context.budget.spentUsd, context.budget.capUsd);

  const maxIterations = params.maxIterations ?? 6;
  const messages: AiMessage[] = [...params.messages];
  let usage = emptyUsage();
  const searchErrors: string[] = [];
  let last: AiResponse | null = null;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    const response = await context.client.create({
      model: context.model,
      max_tokens: params.max_tokens,
      ...(params.system === undefined ? {} : { system: params.system }),
      messages,
      ...(params.tools ? { tools: params.tools } : {}),
      ...(params.thinking ? { thinking: params.thinking } : {}),
      ...(params.output_config ? { output_config: params.output_config } : {}),
    });

    usage = addUsage(usage, readUsage(response.usage));
    searchErrors.push(...collectServerToolErrors(response.content));
    last = response;

    if (response.stop_reason !== "pause_turn") break;

    // Resume: hand the paused turn back unchanged and let the model continue.
    messages.push({ role: "assistant", content: response.content });
  }

  const costUsd = await settle(context, usage);
  return {
    text: last ? textOf(last.content) : "",
    content: last?.content ?? [],
    usage,
    costUsd,
    searchErrors,
    truncated: last?.stop_reason === "pause_turn",
    iterations,
  };
}
