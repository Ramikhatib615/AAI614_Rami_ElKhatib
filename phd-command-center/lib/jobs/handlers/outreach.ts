import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { aiClient, modelFor } from "@/lib/ai/client";
import {
  OUTREACH_SYSTEM,
  draftableFacts,
  outreachDraftSchema,
  outreachPrompt,
} from "@/lib/ai/generate/outreach";
import { callStructured } from "@/lib/ai/invoke";
import { monthToDateSpendUsd, recordUsage } from "@/lib/ai/usage";
import { serverEnv } from "@/lib/env";
import {
  colleaguesAlreadyContacted,
  draftsForProfessor,
  insertDraft,
  otherDraftBodies,
} from "@/lib/outreach/store";
import { checkDraft, wordCount } from "@/lib/outreach/rules";
import { getProfessor } from "@/lib/professors/store";
import { siteConfig } from "@/lib/site";
import type { JobHandler } from "../types";

/**
 * Writes one draft for one professor. It never sends anything: the result is a row Rami reads,
 * edits and approves, after which the UI offers copy and a mailto link and nothing else.
 */
export const draftOutreach: JobHandler = async ({ job }) => {
  const professorId = String(job.payload.professorId ?? "");
  if (!professorId) return { status: "paused", reason: "No professorId given." };

  const professor = await getProfessor(professorId);
  if (!professor)
    return { status: "paused", reason: `Professor ${professorId} is no longer stored.` };

  if (professor.whyNotContact) {
    return {
      status: "paused",
      reason: `Their page says not to contact them: "${professor.whyNotContact}". No draft was written.`,
    };
  }

  const verifiedPapers = professor.recentPapers.filter(
    (paper) => paper.verified && paper.openAlexId,
  );
  if (verifiedPapers.length === 0) {
    return {
      status: "paused",
      reason: `${professor.name} has no verified paper on record, so there is nothing specific to write about. Verify their page first.`,
    };
  }

  // The outreach log: one draft per professor unless Rami asks for a follow-up.
  const existing = await draftsForProfessor(professorId);
  if (existing.length > 0 && job.payload.force !== true) {
    return {
      status: "done",
      result: {
        skipped: true,
        reason: "A draft already exists for this professor.",
        draftId: existing[0].id,
      },
    };
  }

  const env = serverEnv();
  const facts = draftableFacts();

  const generated = await callStructured(
    {
      client: aiClient(),
      model: modelFor("writing"),
      purpose: "outreach.draft",
      budget: { spentUsd: await monthToDateSpendUsd(), capUsd: env.AI_MONTHLY_BUDGET_USD },
      onUsage: async (usage) => {
        await recordUsage({ ...usage, purpose: "outreach.draft", jobId: job.id });
      },
    },
    {
      schema: outreachDraftSchema,
      outputFormat: zodOutputFormat(outreachDraftSchema),
      system: OUTREACH_SYSTEM,
      maxTokens: 4000,
      effort: "high",
      messages: [
        {
          role: "user",
          content: outreachPrompt({
            professorName: professor.name,
            institution: professor.department ?? null,
            papers: verifiedPapers,
            facts,
            cvUrl: `${siteConfig.url}/cv`,
          }),
        },
      ],
    },
  );

  if (generated.status === "needs_review") {
    return { status: "paused", reason: `The draft could not be produced: ${generated.reason}` };
  }

  const others = await otherDraftBodies(professorId);
  const check = checkDraft({
    draft: generated.data,
    papers: professor.recentPapers,
    whyNotContact: professor.whyNotContact,
    otherDrafts: others,
  });

  const colleagues = await colleaguesAlreadyContacted(professor.institutionId, professorId);
  const warnings = [
    ...check.errors.map((issue) => `blocking: ${issue.message}`),
    ...check.warnings.map((issue) => issue.message),
    ...(colleagues.length > 0
      ? [
          `You have already written to ${colleagues
            .map((person) => person.name)
            .join(
              ", ",
            )} at the same institution. Two letters into one department at once gets noticed.`,
        ]
      : []),
  ];

  const draftId = await insertDraft({
    professorId,
    subjectOptions: generated.data.subjectOptions,
    body: generated.data.body,
    factIdsUsed: generated.data.factIdsUsed,
    paperIdsReferenced: generated.data.paperIdsReferenced,
    wordCount: wordCount(generated.data.body),
    maxSimilarity: check.similarity[0]?.score ?? 0,
    warnings,
    status: "draft",
  });

  return {
    status: "done",
    result: {
      draftId,
      approvable: check.approvable,
      words: check.wordCount,
      warnings: warnings.length,
      costUsd: generated.costUsd,
    },
  };
};
