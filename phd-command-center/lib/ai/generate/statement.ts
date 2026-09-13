import { z } from "zod";

import type { Fact } from "@/data/profile";
import { draftableFacts } from "./outreach";
import { CLICHES } from "@/lib/outreach/rules";

export const statementSchema = z.object({
  title: z.string().min(4).max(120),
  body: z.string().min(400),
  factIdsUsed: z.array(z.string().min(1)).min(4),
  /** What the statement claims about fit, so Rami can check the argument rather than the prose. */
  argument: z.string().min(40).max(600),
});

export type StatementOutput = z.infer<typeof statementSchema>;

export type StatementKind = "sop" | "research_statement" | "motivation_letter" | "cover_letter";

const SHAPES: Record<StatementKind, string> = {
  sop: "A statement of purpose: what he wants to work on, what in his record led there, why this program and these people, and what he intends to do with it.",
  research_statement:
    "A research statement: the problem he wants to work on, why it matters, what he has already done that bears on it, and how he would start.",
  motivation_letter:
    "A two-page motivation letter in the ELLIS and IMPRS style: research interests, relevant background, and the specific groups he wants to work with.",
  cover_letter: "A short cover letter accompanying an application to a named position.",
};

export function statementSystem(kind: StatementKind, wordLimit: number): string {
  return `You draft a ${kind.replace(/_/g, " ")} for a PhD applicant. Rami edits and approves it; what you write is a first draft, never a final document.

${SHAPES[kind]}

Hard rules:
1. Every claim about Rami comes from the numbered facts you are given, and you list the ids you used. Nothing else. No invented coursework, no invented motivation, no claimed publications.
2. Stay under ${wordLimit} words. Committees enforce limits.
3. No stock phrases. Among the banned: ${CLICHES.slice(0, 6).join("; ")}.
4. Write in his voice: plain, specific, first person. Concrete work over adjectives. No em dashes, no exclamation marks.
5. Where his record is thin, say what he is doing about it rather than dressing it up. An honest gap reads better than a padded one.
6. Do not name a professor or a program unless it appears in the context you are given.`;
}

export function statementPrompt(input: {
  kind: StatementKind;
  wordLimit: number;
  facts: readonly Fact[];
  target: string | null;
  programContext: string | null;
}): string {
  return [
    `Type: ${input.kind}`,
    `Word limit: ${input.wordLimit}`,
    input.target
      ? `Written for: ${input.target}`
      : "Written as a general version, not yet targeted.",
    input.programContext ? `What the program says it wants:\n${input.programContext}` : null,
    "",
    "Facts you may use (cite the ids, and use nothing else):",
    input.facts.map((fact) => `- ${fact.id}: ${fact.text}`).join("\n"),
    "",
    "Write the draft.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Statements may draw on the same confirmed, public facts the outreach letters use. */
export { draftableFacts };
