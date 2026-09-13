import { checkFactIds } from "@/lib/integrity/facts";
import type { RecentPaper } from "@/db/schema";
import { compareAgainst, type SimilarityFinding } from "./similarity";

export const MIN_WORDS = 150;
export const MAX_WORDS = 220;

/**
 * Openings and phrases that mark a letter as mass-produced. A professor reads dozens of these a
 * week; any one of them costs more than it earns (PROMPT.md §6.4).
 */
export const CLICHES = [
  "i hope this email finds you well",
  "i hope this message finds you well",
  "esteemed",
  "prestigious",
  "world-renowned",
  "world renowned",
  "groundbreaking",
  "ground-breaking",
  "i am writing to express my keen interest",
  "it would be an honor",
  "it would be a great honor",
  "avid follower",
  "deeply inspired",
  "revolutionize",
  "i have always been passionate",
  "your esteemed research",
  "distinguished work",
];

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface DraftCandidate {
  subjectOptions: string[];
  body: string;
  factIdsUsed: string[];
  /** OpenAlex ids of papers the draft refers to. */
  paperIdsReferenced: string[];
}

export interface OutreachIssue {
  code:
    | "word_count"
    | "cliche"
    | "unknown_fact"
    | "unconfirmed_fact"
    | "unverified_paper"
    | "no_paper_cited"
    | "too_similar"
    | "do_not_contact"
    | "missing_subject";
  message: string;
}

export interface OutreachCheck {
  errors: OutreachIssue[];
  warnings: OutreachIssue[];
  similarity: SimilarityFinding[];
  wordCount: number;
  approvable: boolean;
}

export interface CheckInput {
  draft: DraftCandidate;
  /** The professor's stored papers — the only papers a draft may refer to. */
  papers: readonly RecentPaper[];
  /** A published instruction not to contact, if the page carried one. */
  whyNotContact: string | null;
  otherDrafts: readonly { id: string; body: string }[];
}

/**
 * Everything a draft must satisfy before Rami can approve it. Errors block approval; warnings are
 * his call. Nothing here sends anything — approval only unlocks copy and a mailto link.
 */
export function checkDraft(input: CheckInput): OutreachCheck {
  const errors: OutreachIssue[] = [];
  const warnings: OutreachIssue[] = [];
  const { draft } = input;

  if (input.whyNotContact) {
    errors.push({
      code: "do_not_contact",
      message: `Their page says: "${input.whyNotContact}". No draft should be written, let alone sent.`,
    });
  }

  const words = wordCount(draft.body);
  if (words < MIN_WORDS || words > MAX_WORDS) {
    errors.push({
      code: "word_count",
      message: `The body is ${words} words; it has to sit between ${MIN_WORDS} and ${MAX_WORDS}.`,
    });
  }

  if (draft.subjectOptions.filter((option) => option.trim().length > 0).length < 3) {
    errors.push({
      code: "missing_subject",
      message: "Three subject lines are required to choose from.",
    });
  }

  const haystack = draft.body.toLowerCase();
  for (const cliche of CLICHES) {
    if (haystack.includes(cliche)) {
      errors.push({ code: "cliche", message: `Contains the stock phrase "${cliche}".` });
    }
  }

  const factCheck = checkFactIds(draft.factIdsUsed);
  for (const id of factCheck.missing) {
    errors.push({
      code: "unknown_fact",
      message: `Cites "${id}", which is not a fact in the profile.`,
    });
  }
  for (const id of factCheck.unconfirmed) {
    errors.push({
      code: "unconfirmed_fact",
      message: `Uses "${id}", which still needs confirmation.`,
    });
  }
  for (const id of factCheck.unevidencedMetrics) {
    warnings.push({
      code: "unconfirmed_fact",
      message: `"${id}" carries a metric with no evidence behind it.`,
    });
  }

  // A draft must name a real paper, and only one the professor's record actually holds.
  const verified = new Map(
    input.papers
      .filter((paper) => paper.verified && paper.openAlexId)
      .map((paper) => [paper.openAlexId as string, paper]),
  );
  if (draft.paperIdsReferenced.length === 0) {
    errors.push({
      code: "no_paper_cited",
      message:
        "The draft refers to no paper. A letter with no specific observation is not worth sending.",
    });
  }
  for (const id of draft.paperIdsReferenced) {
    if (!verified.has(id)) {
      errors.push({
        code: "unverified_paper",
        message: `Refers to "${id}", which is not among this professor's verified papers.`,
      });
    }
  }

  const similarity = compareAgainst(draft.body, input.otherDrafts);
  for (const finding of similarity) {
    const issue: OutreachIssue = {
      code: "too_similar",
      message: `${Math.round(finding.score * 100)}% overlap with draft ${finding.otherId}.`,
    };
    if (finding.level === "block") errors.push(issue);
    else warnings.push(issue);
  }

  return { errors, warnings, similarity, wordCount: words, approvable: errors.length === 0 };
}

/** The workflow from PROMPT.md §6.4. Sending happens in Rami's mail client, never here. */
export const OUTREACH_TRANSITIONS: Record<string, string[]> = {
  draft: ["reviewed", "closed"],
  reviewed: ["approved", "draft", "closed"],
  approved: ["sent_manually", "reviewed", "closed"],
  sent_manually: ["follow_up_due", "replied", "closed"],
  follow_up_due: ["sent_manually", "replied", "closed"],
  replied: ["closed"],
  closed: [],
};

export function canTransition(from: string, to: string): boolean {
  return OUTREACH_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Fourteen days after sending, once. */
export const FOLLOW_UP_DAYS = 14;

export function followUpDate(sentAt: Date, days = FOLLOW_UP_DAYS): Date {
  return new Date(sentAt.getTime() + days * 24 * 60 * 60 * 1000);
}

/** At most one follow-up per professor, ever. */
export function mayFollowUp(existingFollowUps: number): boolean {
  return existingFollowUps < 1;
}

/** A mailto link. It opens Rami's own client with the draft in it; it cannot send. */
export function mailtoLink(input: { to: string; subject: string; body: string }): string {
  const params = new URLSearchParams({ subject: input.subject, body: input.body });
  return `mailto:${encodeURIComponent(input.to)}?${params.toString()}`;
}
