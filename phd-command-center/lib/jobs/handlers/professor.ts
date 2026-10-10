import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { aiClient, modelFor } from "@/lib/ai/client";
import {
  FACULTY_PAGE_SYSTEM,
  checkFacultyExtraction,
  facultyPagePrompt,
  facultyPageSchema,
} from "@/lib/ai/extract/faculty-page";
import { callStructured } from "@/lib/ai/invoke";
import { webFetchTool, webSearchTool } from "@/lib/ai/tools";
import { monthToDateSpendUsd, recordUsage } from "@/lib/ai/usage";
import { serverEnv } from "@/lib/env";
import {
  applyVerification,
  getProfessor,
  upsertCandidate,
  upsertInstitution,
} from "@/lib/professors/store";
import { scoreProfessor } from "@/lib/scoring/professor-fit";
import { SourceRateLimitError } from "@/lib/sources/http";
import { aggregateAuthors, searchWorks } from "@/lib/sources/openalex";
import type { JobHandler } from "../types";

const DISCOVERY_PER_PAGE = 50;
const VERIFY_TOP_N = 8;

function openAlexConfig() {
  const env = serverEnv();
  return { contactEmail: env.OPENALEX_MAILTO, apiKey: env.OPENALEX_API_KEY };
}

/** Three years back, the window PROMPT.md §6.3 asks for. */
function defaultFromDate(now = new Date()): string {
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 3);
  return from.toISOString().slice(0, 10);
}

export const discoverProfessors: JobHandler = async ({ job, enqueue }) => {
  const topic = String(job.payload.topic ?? "").trim();
  if (!topic) return { status: "paused", reason: "No topic given for discovery." };
  const fromDate = String(job.payload.fromDate ?? defaultFromDate());

  let result;
  try {
    result = await searchWorks(openAlexConfig(), {
      query: topic,
      fromDate,
      perPage: DISCOVERY_PER_PAGE,
    });
  } catch (error: unknown) {
    if (error instanceof SourceRateLimitError) {
      // OpenAlex meters usage; a spent budget is a wait, not a failure.
      return {
        status: "paused",
        reason:
          `OpenAlex is rate limited: ${error.detail} Retry in about ${Math.round(error.retryAfterSeconds / 60)} minutes. ` +
          "A free OpenAlex API key raises the daily budget tenfold; set OPENALEX_API_KEY.",
      };
    }
    throw error;
  }

  const candidates = aggregateAuthors(result.data.works);
  let stored = 0;

  for (const candidate of candidates.slice(0, VERIFY_TOP_N * 3)) {
    const institutionId = candidate.institutionName
      ? await upsertInstitution({
          name: candidate.institutionName,
          country: candidate.countryCode,
          openAlexId: candidate.institutionId,
        })
      : null;

    const professorId = await upsertCandidate(candidate, institutionId);
    stored += 1;

    if (stored <= VERIFY_TOP_N) {
      await enqueue({
        type: "professor.verify_page",
        payload: { professorId, topic },
        dedupeKey: `professor.verify_page:${professorId}`,
      });
    }
  }

  return {
    status: "done",
    result: {
      topic,
      worksSeen: result.data.works.length,
      totalMatching: result.data.count,
      candidatesStored: stored,
      queuedForVerification: Math.min(stored, VERIFY_TOP_N),
      openAlexCostUsd: result.costUsd,
    },
  };
};

/**
 * Reads the professor's own page and records only what it says. The model gets web search and
 * fetch restricted to the institution's own domain where one is known, so it cannot wander onto a
 * directory site and read an address off it.
 */
export const verifyProfessorPage: JobHandler = async ({ job }) => {
  const professorId = String(job.payload.professorId ?? "");
  if (!professorId) return { status: "paused", reason: "No professorId given." };

  const professor = await getProfessor(professorId);
  if (!professor)
    return { status: "paused", reason: `Professor ${professorId} is no longer stored.` };

  const env = serverEnv();
  const allowedDomains =
    typeof job.payload.allowedDomain === "string" ? [job.payload.allowedDomain] : undefined;

  const extraction = await callStructured(
    {
      client: aiClient(),
      model: modelFor("research"),
      purpose: "professor.verify_page",
      budget: { spentUsd: await monthToDateSpendUsd(), capUsd: env.AI_MONTHLY_BUDGET_USD },
      onUsage: async (usage) => {
        await recordUsage({ ...usage, purpose: "professor.verify_page", jobId: job.id });
      },
    },
    {
      schema: facultyPageSchema,
      outputFormat: zodOutputFormat(facultyPageSchema),
      system: FACULTY_PAGE_SYSTEM,
      maxTokens: 4000,
      tools: [
        webSearchTool({ maxUses: 3, allowedDomains }),
        webFetchTool({ maxUses: 3, allowedDomains, maxContentTokens: 15_000 }),
      ],
      messages: [
        {
          role: "user",
          content: facultyPagePrompt({
            name: professor.name,
            institution: null,
            homepageUrl: professor.homepageUrl ?? `the official page for ${professor.name}`,
          }),
        },
      ],
    },
  );

  if (extraction.status === "needs_review") {
    return {
      status: "paused",
      reason: `Could not verify ${professor.name}'s page: ${extraction.reason}`,
    };
  }

  const checked = checkFacultyExtraction(extraction.data);
  const value = checked.value;

  const fit = scoreProfessor({
    topics: professor.topics,
    papers: professor.recentPapers,
    recruitingSignal: value.recruitingSignal,
    linkedProgramFunded: null,
    currentYear: new Date().getUTCFullYear(),
  });

  const sources = [value.currentPosition, value.department, value.labName]
    .filter((field): field is NonNullable<typeof field> => field !== null)
    .map((field) => ({
      url: field.sourceUrl,
      evidenceSnippet: field.evidence.split(/\s+/).slice(0, 25).join(" "),
      fetchedAt: new Date().toISOString(),
    }));

  await applyVerification(professorId, {
    title: value.currentPosition?.value ?? null,
    department: value.department?.value ?? null,
    labName: value.labName?.value ?? null,
    homepageUrl: value.homepageUrl,
    officialEmail: value.officialEmail?.address ?? null,
    emailSourceUrl: value.officialEmail?.sourceUrl ?? null,
    recruitingSignal: value.recruitingSignal,
    whyNotContact: value.doNotContact?.text ?? null,
    sources,
    fitScore: fit.score,
    fitRationale: {
      components: fit.components,
      matchedInterests: fit.matchedInterests,
      warnings: [
        ...checked.warnings,
        ...extraction.searchErrors.map((code) => `Search error: ${code}`),
      ],
      notFound: value.notFound,
    },
  });

  return {
    status: "done",
    result: {
      name: professor.name,
      fitScore: fit.score,
      emailFound: value.officialEmail !== null,
      emailRedacted: checked.redacted,
      recruiting: value.recruitingSignal !== null,
    },
  };
};
