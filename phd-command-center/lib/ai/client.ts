import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { serverEnv } from "@/lib/env";
import type { AiClient, AiParsedResponse, AiResponse } from "./types";

let cached: Anthropic | undefined;

export function anthropic(): Anthropic {
  if (!cached) {
    const env = serverEnv();
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set; no AI work can run.");
    }
    cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  }
  return cached;
}

export type ModelRole = "research" | "writing" | "fast";

export function modelFor(role: ModelRole): string {
  const env = serverEnv();
  switch (role) {
    case "research":
      return env.ANTHROPIC_MODEL_RESEARCH;
    case "writing":
      return env.ANTHROPIC_MODEL_WRITING;
    case "fast":
      return env.ANTHROPIC_MODEL_FAST;
  }
}

/**
 * Adapter from the SDK to the narrow `AiClient` the call helpers use. The casts are confined to
 * this boundary: the SDK's parameter types are wider than what we send, and `parse` returns the
 * parsed value as `unknown` until Zod validates it.
 */
export function aiClient(): AiClient {
  const client = anthropic();
  return {
    async create(params) {
      const response = await client.messages.create(
        params as unknown as Parameters<typeof client.messages.create>[0],
      );
      return response as unknown as AiResponse;
    },
    async parse(params) {
      const response = await client.messages.parse(
        params as unknown as Parameters<typeof client.messages.parse>[0],
      );
      return response as unknown as AiParsedResponse;
    },
  };
}
