import { z } from "zod";

import { allFacts, type Fact } from "@/data/profile";
import type { RecentPaper } from "@/db/schema";
import { CLICHES, MAX_WORDS, MIN_WORDS } from "@/lib/outreach/rules";

export const outreachDraftSchema = z.object({
  /** Three to choose from, so Rami picks rather than edits. */
  subjectOptions: z.array(z.string().min(8).max(90)).length(3),
  body: z.string().min(200),
  /** The ids of the profile facts each claim rests on. At least two, or the letter says nothing. */
  factIdsUsed: z.array(z.string().min(1)).min(2),
  /** OpenAlex ids of the papers referred to. */
  paperIdsReferenced: z.array(z.string().min(1)).min(1),
  /** The specific, checkable thing noticed about the paper. */
  observation: z.string().min(20).max(400),
});

export type OutreachDraftOutput = z.infer<typeof outreachDraftSchema>;

export const OUTREACH_SYSTEM = `You draft one email from a PhD applicant to one professor. Rami reviews, edits and sends it himself — you are writing a first draft for a person, not sending anything.

Hard rules:
1. Every claim about Rami must come from the numbered facts you are given, and you must list the ids you used. Do not add a skill, a metric, a title, a date or an outcome that is not in that list. If a fact is not there, the letter does not claim it.
2. Refer only to the papers you are given, by their id. Describe what the paper is about in a way the given title and venue support. Do not invent findings, numbers, or claims about what the paper showed.
3. ${MIN_WORDS}–${MAX_WORDS} words in the body. Count them.
4. No stock phrases. These are banned outright: ${CLICHES.slice(0, 8).join("; ")}. No flattery. No adjectives about the professor's standing.
5. Structure, in order: who Rami is in one sentence; one specific observation about a named paper; two or three facts from his record that connect to that work and why; the concrete ask — whether they are taking doctoral students for Fall 2027 and through which program; a line pointing to his CV; a plain close.
6. Plain, direct English. Short sentences. No em dashes, no exclamation marks, no bullet lists.
7. Write the body only: no "Dear Professor X" line and no signature. Those are added around it.

The ask is the point of the letter. Make it easy to answer in one line.`;

export function outreachPrompt(input: {
  professorName: string;
  institution: string | null;
  papers: readonly RecentPaper[];
  facts: readonly Fact[];
  cvUrl: string;
}): string {
  const facts = input.facts.map((fact) => `- ${fact.id}: ${fact.text}`).join("\n");

  const papers = input.papers
    .map(
      (paper) =>
        `- ${paper.openAlexId}: "${paper.title}"${paper.year ? ` (${paper.year}` : ""}${
          paper.venue ? `, ${paper.venue})` : paper.year ? ")" : ""
        }`,
    )
    .join("\n");

  return [
    `Professor: ${input.professorName}${input.institution ? `, ${input.institution}` : ""}`,
    "",
    "Their recent papers (refer to these by id, and only these):",
    papers,
    "",
    "Facts about Rami you may use (cite the ids you use, and use nothing else):",
    facts,
    "",
    `His CV is at ${input.cvUrl}.`,
    "",
    "Write the draft.",
  ].join("\n");
}

/**
 * The facts a draft may draw on: confirmed only, and weighted toward the research story rather
 * than the administrative work. Anything still awaiting confirmation is excluded here as well as
 * by the checker, so the model is never shown a claim it could be tempted to use.
 */
export function draftableFacts(): Fact[] {
  const wanted = new Set(["interest", "education", "project", "skill", "positioning"]);

  return allFacts().filter((fact) => {
    if (fact.status !== "confirmed" || fact.retired) return false;
    if (fact.visibility !== "public") return false;
    if (wanted.has(fact.kind)) return true;
    // Research-relevant experience only: the tagged bullets, not the administrative ones.
    return fact.kind === "experience" && (fact.tags?.length ?? 0) > 0;
  });
}
