import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { aiClient, modelFor } from "@/lib/ai/client";
import {
  draftableFacts,
  statementPrompt,
  statementSchema,
  statementSystem,
  type StatementKind,
} from "@/lib/ai/generate/statement";
import { callStructured } from "@/lib/ai/invoke";
import { monthToDateSpendUsd, recordUsage } from "@/lib/ai/usage";
import { db } from "@/db";
import { statements } from "@/db/schema";
import { serverEnv } from "@/lib/env";
import { getProgram } from "@/lib/programs/store";
import { DEFAULT_WORD_LIMITS, checkStatement } from "@/lib/statements/rules";
import type { JobHandler } from "../types";

export const draftStatement: JobHandler = async ({ job }) => {
  const kind = String(job.payload.kind ?? "sop") as StatementKind;
  const wordLimit = Number(job.payload.wordLimit ?? DEFAULT_WORD_LIMITS[kind] ?? 1000);
  const programId = typeof job.payload.programId === "string" ? job.payload.programId : null;
  const program = programId ? await getProgram(programId) : null;

  const env = serverEnv();
  const facts = draftableFacts();

  const generated = await callStructured(
    {
      client: aiClient(),
      model: modelFor("writing"),
      purpose: "statement.draft",
      budget: { spentUsd: await monthToDateSpendUsd(), capUsd: env.AI_MONTHLY_BUDGET_USD },
      onUsage: async (usage) => {
        await recordUsage({ ...usage, purpose: "statement.draft", jobId: job.id });
      },
    },
    {
      schema: statementSchema,
      outputFormat: zodOutputFormat(statementSchema),
      system: statementSystem(kind, wordLimit),
      maxTokens: 8000,
      effort: "high",
      messages: [
        {
          role: "user",
          content: statementPrompt({
            kind,
            wordLimit,
            facts,
            target: program ? `${program.university} — ${program.programName}` : null,
            programContext: program
              ? [
                  program.degreeRequirement
                    ? `Degree requirement: ${program.degreeRequirement}`
                    : null,
                  program.documents.length ? `Documents: ${program.documents.join("; ")}` : null,
                  program.researchAreas.length
                    ? `Research areas: ${program.researchAreas.join("; ")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n")
              : null,
          }),
        },
      ],
    },
  );

  if (generated.status === "needs_review") {
    return { status: "paused", reason: `The statement could not be produced: ${generated.reason}` };
  }

  const check = checkStatement({
    body: generated.data.body,
    factIdsUsed: generated.data.factIdsUsed,
    wordLimit,
    status: "draft",
  });

  const [row] = await db()
    .insert(statements)
    .values({
      type: kind,
      targetId: programId,
      title: generated.data.title,
      body: generated.data.body,
      factIdsUsed: generated.data.factIdsUsed,
      wordLimit,
      wordCount: check.wordCount,
      warnings: [
        ...check.errors.map((issue) => `blocking: ${issue.message}`),
        ...check.warnings.map((issue) => issue.message),
        `Argument as written: ${generated.data.argument}`,
      ],
      status: check.approvable ? "draft" : "needs_review",
    })
    .returning({ id: statements.id });

  return {
    status: "done",
    result: {
      statementId: row.id,
      words: check.wordCount,
      approvable: check.approvable,
      costUsd: generated.costUsd,
    },
  };
};
