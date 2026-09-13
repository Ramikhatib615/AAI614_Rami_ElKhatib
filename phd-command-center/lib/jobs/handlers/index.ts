import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { aiClient, modelFor } from "@/lib/ai/client";
import { callStructured } from "@/lib/ai/invoke";
import { monthToDateSpendUsd, recordUsage } from "@/lib/ai/usage";
import { serverEnv } from "@/lib/env";
import { draftOutreach } from "./outreach";
import { discoverProfessors, verifyProfessorPage } from "./professor";
import type { JobHandlerRegistry } from "../types";

const probeSchema = z.object({
  ok: z.literal(true),
  note: z.string().max(120),
});

/**
 * Handlers registered so far. The program and professor pipelines land in phases 5 and 6; these
 * two exist so the queue and the AI path can be exercised end to end — including in the
 * post-deploy smoke test.
 */
export const handlers: JobHandlerRegistry = {
  // No AI, no network: proves the queue claims, runs and completes a job.
  "diagnostics.ping": async ({ job }) => ({
    status: "done",
    result: { pong: true, at: new Date().toISOString(), payload: job.payload },
  }),

  // One small call on the fast model: proves the key, the schema path, and usage logging.
  "ai.probe": async ({ job }) => {
    const env = serverEnv();
    const model = modelFor("fast");
    const result = await callStructured(
      {
        client: aiClient(),
        model,
        purpose: "ai.probe",
        budget: { spentUsd: await monthToDateSpendUsd(), capUsd: env.AI_MONTHLY_BUDGET_USD },
        onUsage: async (usage) => {
          await recordUsage({ ...usage, purpose: "ai.probe", jobId: job.id });
        },
      },
      {
        schema: probeSchema,
        outputFormat: zodOutputFormat(probeSchema),
        maxTokens: 256,
        messages: [
          {
            role: "user",
            content:
              'Reply with {"ok": true, "note": "<the current UTC date as YYYY-MM-DD>"}. Nothing else.',
          },
        ],
      },
    );

    if (result.status === "needs_review") {
      return { status: "paused", reason: result.reason };
    }
    return { status: "done", result: { note: result.data.note, costUsd: result.costUsd } };
  },

  "professor.discover": discoverProfessors,
  "professor.verify_page": verifyProfessorPage,
  "outreach.draft": draftOutreach,
};
