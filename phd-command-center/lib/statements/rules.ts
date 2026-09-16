import { checkFactIds } from "@/lib/integrity/facts";
import { CLICHES, wordCount } from "@/lib/outreach/rules";

/** Common limits. A program's own limit always overrides these. */
export const DEFAULT_WORD_LIMITS: Record<string, number> = {
  sop: 1000,
  research_statement: 1500,
  motivation_letter: 900,
  cover_letter: 600,
};

export interface StatementIssue {
  code: "over_limit" | "too_short" | "unknown_fact" | "unconfirmed_fact" | "cliche" | "no_facts";
  message: string;
}

export interface StatementCheck {
  errors: StatementIssue[];
  warnings: StatementIssue[];
  wordCount: number;
  /** Statements always need Rami's edit before they are usable, whatever the checks say. */
  requiresEdit: boolean;
  approvable: boolean;
}

export function checkStatement(input: {
  body: string;
  factIdsUsed: readonly string[];
  wordLimit: number | null;
  status: string;
}): StatementCheck {
  const errors: StatementIssue[] = [];
  const warnings: StatementIssue[] = [];
  const words = wordCount(input.body);

  if (input.wordLimit && words > input.wordLimit) {
    errors.push({
      code: "over_limit",
      message: `${words} words against a limit of ${input.wordLimit}. Committees enforce these.`,
    });
  }
  if (input.wordLimit && words < input.wordLimit * 0.5) {
    warnings.push({
      code: "too_short",
      message: `${words} words where ${input.wordLimit} are allowed — the space is there to be used.`,
    });
  }

  if (input.factIdsUsed.length === 0) {
    errors.push({ code: "no_facts", message: "The statement cites no facts from the profile." });
  }

  const factCheck = checkFactIds([...input.factIdsUsed]);
  for (const id of factCheck.missing) {
    errors.push({ code: "unknown_fact", message: `Cites "${id}", which is not in the profile.` });
  }
  for (const id of factCheck.unconfirmed) {
    errors.push({
      code: "unconfirmed_fact",
      message: `Uses "${id}", which still needs confirmation.`,
    });
  }

  const haystack = input.body.toLowerCase();
  for (const cliche of CLICHES) {
    if (haystack.includes(cliche)) {
      warnings.push({ code: "cliche", message: `Contains the stock phrase "${cliche}".` });
    }
  }

  return {
    errors,
    warnings,
    wordCount: words,
    requiresEdit: input.status !== "approved",
    approvable: errors.length === 0,
  };
}

export const STATEMENT_TRANSITIONS: Record<string, string[]> = {
  draft: ["needs_review", "edited"],
  needs_review: ["edited", "draft"],
  edited: ["approved", "draft"],
  approved: ["edited"],
};

export function canTransitionStatement(from: string, to: string): boolean {
  return STATEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
