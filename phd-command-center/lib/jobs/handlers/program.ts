import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { aiClient, modelFor } from "@/lib/ai/client";
import {
  PROGRAM_PAGE_SYSTEM,
  checkProgramExtraction,
  programPagePrompt,
  programPageSchema,
} from "@/lib/ai/extract/program-page";
import { callStructured, type InvokeContext } from "@/lib/ai/invoke";
import { webFetchTool, webSearchTool } from "@/lib/ai/tools";
import { monthToDateSpendUsd, recordUsage } from "@/lib/ai/usage";
import { serverEnv } from "@/lib/env";
import { getProgram, setScore, upsertProgram } from "@/lib/programs/store";
import { scoreProgram } from "@/lib/scoring/program-fit";
import type { JobHandler } from "../types";

const candidateSchema = z.object({
  pages: z
    .array(
      z.object({
        university: z.string().min(2),
        programName: z.string().min(2),
        /** The official university page, never an aggregator. */
        url: z.url(),
        why: z.string().max(200),
      }),
    )
    .max(8),
  notes: z.string().max(400).nullable(),
});

/** Shared invoke context: the research model, the month's spend, and a usage row per call. */
async function researchContext(purpose: string, jobId: string): Promise<InvokeContext> {
  const env = serverEnv();
  return {
    client: aiClient(),
    model: modelFor("research"),
    purpose,
    budget: { spentUsd: await monthToDateSpendUsd(), capUsd: env.AI_MONTHLY_BUDGET_USD },
    onUsage: async (usage) => {
      await recordUsage({ ...usage, purpose, jobId });
    },
  };
}

/**
 * Finds official admissions pages for one region and one research interest, then queues an
 * extraction for each. Discovery never writes a program record: only the extraction step, which
 * has read a page, may do that.
 */
export const discoverPrograms: JobHandler = async ({ job, enqueue }) => {
  const region = String(job.payload.region ?? "").trim();
  const interest = String(job.payload.interest ?? "").trim();
  if (!region || !interest)
    return { status: "paused", reason: "Discovery needs a region and an interest." };

  const found = await callStructured(await researchContext("program.discover", job.id), {
    schema: candidateSchema,
    outputFormat: zodOutputFormat(candidateSchema),
    system:
      "You find official PhD admissions pages. Return the university's own page, never an aggregator such as FindAPhD — follow those through to the official page. Return nothing rather than a page you did not open.",
    maxTokens: 3000,
    tools: [webSearchTool({ maxUses: 5 }), webFetchTool({ maxUses: 5 })],
    messages: [
      {
        role: "user",
        content: `Find funded PhD programs in ${region} for ${interest}, open to international applicants, starting Fall 2027. Return their official admissions pages.`,
      },
    ],
  });

  if (found.status === "needs_review") {
    return { status: "paused", reason: `Discovery returned nothing usable: ${found.reason}` };
  }

  for (const page of found.data.pages) {
    await enqueue({
      type: "program.extract",
      payload: {
        url: page.url,
        university: page.university,
        programName: page.programName,
        region,
      },
      dedupeKey: `program.extract:${page.url}`,
    });
  }

  return {
    status: "done",
    result: {
      region,
      interest,
      queued: found.data.pages.length,
      notes: found.data.notes,
      searchErrors: found.searchErrors,
      costUsd: found.costUsd,
    },
  };
};

export const extractProgram: JobHandler = async ({ job }) => {
  const url = String(job.payload.url ?? "");
  if (!url) return { status: "paused", reason: "No url to extract." };
  const region = String(job.payload.region ?? "unknown");

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return undefined;
    }
  })();

  const extracted = await callStructured(await researchContext("program.extract", job.id), {
    schema: programPageSchema,
    outputFormat: zodOutputFormat(programPageSchema),
    system: PROGRAM_PAGE_SYSTEM,
    maxTokens: 6000,
    tools: [
      // Narrowed to the university's own domain, so nothing is read off a third-party listing.
      webFetchTool({
        maxUses: 4,
        allowedDomains: host ? [host] : undefined,
        maxContentTokens: 25_000,
      }),
    ],
    messages: [
      {
        role: "user",
        content: programPagePrompt({
          url,
          hint:
            `${job.payload.university ?? ""} ${job.payload.programName ?? ""}`.trim() || undefined,
        }),
      },
    ],
  });

  if (extracted.status === "needs_review") {
    return { status: "paused", reason: `Could not extract ${url}: ${extracted.reason}` };
  }

  const checked = checkProgramExtraction(extracted.data);
  const value = checked.value;
  const now = new Date().toISOString();

  const sources = [
    value.degreeRequirement,
    value.fundingType,
    value.internationalEligibility,
    value.stipend,
  ]
    .filter((field): field is NonNullable<typeof field> => field !== null)
    .map((field) => ({
      url: field.sourceUrl,
      evidenceSnippet: field.evidence.split(/\s+/).slice(0, 25).join(" "),
      fetchedAt: now,
    }));

  for (const deadline of value.deadlines) {
    sources.push({
      url: deadline.sourceUrl,
      evidenceSnippet: deadline.evidence.split(/\s+/).slice(0, 25).join(" "),
      fetchedAt: now,
    });
  }

  const cycle = value.deadlines[0]?.cycle ?? "unknown-cycle";
  const { id, changed } = await upsertProgram({
    university: value.university,
    programName: value.programName,
    cycle,
    values: {
      country: value.country,
      region,
      department: value.department,
      degreeType: value.degreeType,
      researchAreas: value.researchAreas,
      ...(value.admissionRoute ? { admissionRoute: value.admissionRoute } : {}),
      degreeRequirement: value.degreeRequirement?.value ?? null,
      minGpa: value.minGpa?.value ?? null,
      englishTests: value.englishTests?.value ?? null,
      greRequired: value.greRequired,
      documents: value.documents,
      interview: value.interview?.value ?? null,
      fundingType: value.fundingType?.value ?? null,
      stipend: value.stipend?.value ?? null,
      internationalEligibility: value.internationalEligibility?.value ?? null,
      deadlines: value.deadlines.map(({ label, date, timezone, cycle: entryCycle }) => ({
        label,
        date,
        timezone,
        cycle: entryCycle,
      })),
      startTerm: value.startTerm,
      applicationUrl: value.applicationUrl ?? url,
      sources,
      notes: checked.warnings.join(" ") || null,
      confidence: checked.redacted ? 0.6 : 0.85,
    },
  });

  const stored = await getProgram(id);
  if (stored) {
    const fit = scoreProgram({
      researchAreas: stored.researchAreas,
      degreeRequirement: stored.degreeRequirement,
      minGpa: stored.minGpa,
      englishTests: stored.englishTests,
      greRequired: stored.greRequired,
      fundingType: stored.fundingType,
      internationalEligibility: stored.internationalEligibility,
      deadlines: stored.deadlines,
      region: stored.region,
      today: now.slice(0, 10),
      applicant: {
        hasMastersBy: "2027-02",
        englishTestTaken: false,
        greTaken: false,
        excludedRegions: [],
        regionPreferenceKnown: false,
      },
    });
    await setScore(id, fit.score, {
      components: fit.components,
      matchedInterests: fit.matchedInterests,
    });
  }

  return {
    status: "done",
    result: {
      programId: id,
      changed,
      warnings: checked.warnings,
      deadlines: value.deadlines.length,
      costUsd: extracted.costUsd,
    },
  };
};

/** Re-reads a program's own source and marks it outdated when the page has moved on. */
export const refreshProgram: JobHandler = async ({ job, enqueue }) => {
  const programId = String(job.payload.programId ?? "");
  const program = programId ? await getProgram(programId) : null;
  if (!program) return { status: "paused", reason: "No such program." };

  const url = program.applicationUrl ?? program.sources[0]?.url;
  if (!url)
    return { status: "paused", reason: `${program.university} has no source URL to re-read.` };

  await enqueue({
    type: "program.extract",
    payload: {
      url,
      university: program.university,
      programName: program.programName,
      region: program.region,
    },
    dedupeKey: `program.extract:${url}:${new Date().toISOString().slice(0, 10)}`,
  });

  return { status: "done", result: { requeued: url } };
};
