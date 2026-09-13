import type { ChecklistItem } from "@/db/schema";

/**
 * Builds an application checklist from what the program actually requires (PROMPT.md §6.6).
 *
 * Due dates sit a configurable number of days before the official deadline, because a document
 * finished on the deadline is a document submitted late. Items that cannot be dated — because the
 * program has published no date — say so rather than inventing one.
 */
export const DEFAULT_LEAD_DAYS = 14;
/** Referees need longer than paperwork; asking two weeks out is already rude. */
export const REFEREE_LEAD_DAYS = 45;
/** A test result takes weeks to arrive, and slots fill. */
export const TEST_LEAD_DAYS = 90;

export interface ChecklistInput {
  documents: readonly string[];
  englishTests: Record<string, string> | null;
  greRequired: "required" | "optional" | "not_required" | "unknown";
  interview: string | null;
  deadlines: readonly { label: string; date: string | null }[];
  refereeCount?: number;
  applicant: { englishTestTaken: boolean; greTaken: boolean; refereesConfirmed: number };
  leadDays?: number;
}

function subtractDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function earliestDeadline(deadlines: readonly { date: string | null }[]): string | null {
  const dated = deadlines.map((deadline) => deadline.date).filter((date): date is string => !!date);
  return dated.sort()[0] ?? null;
}

export function buildChecklist(input: ChecklistInput): ChecklistItem[] {
  const deadline = earliestDeadline(input.deadlines);
  const lead = input.leadDays ?? DEFAULT_LEAD_DAYS;
  const due = (days: number): string | null => (deadline ? subtractDays(deadline, days) : null);

  const items: ChecklistItem[] = [];

  for (const document of input.documents) {
    items.push({ item: document, done: false, dueDate: due(lead), sourceField: "documents" });
  }

  if (input.englishTests && Object.keys(input.englishTests).length > 0) {
    const requirement = Object.entries(input.englishTests)
      .map(([test, minimum]) => `${test} ${minimum}`)
      .join(" or ");
    items.push({
      item: input.applicant.englishTestTaken
        ? `Send the English score (${requirement})`
        : `Book and sit an English test (${requirement}) — results take weeks`,
      done: false,
      dueDate: due(TEST_LEAD_DAYS),
      sourceField: "englishTests",
    });
  }

  if (input.greRequired === "required" && !input.applicant.greTaken) {
    items.push({
      item: "Book and sit the GRE",
      done: false,
      dueDate: due(TEST_LEAD_DAYS),
      sourceField: "greRequired",
    });
  } else if (input.greRequired === "optional" && !input.applicant.greTaken) {
    items.push({
      item: "Decide whether to submit a GRE score (optional here)",
      done: false,
      dueDate: due(TEST_LEAD_DAYS),
      sourceField: "greRequired",
    });
  } else if (input.greRequired === "unknown") {
    items.push({
      item: "Confirm on the official page whether the GRE is required",
      done: false,
      dueDate: due(lead),
      sourceField: "greRequired",
    });
  }

  const refereesNeeded = input.refereeCount ?? 3;
  if (input.applicant.refereesConfirmed < refereesNeeded) {
    items.push({
      item: `Ask ${refereesNeeded - input.applicant.refereesConfirmed} more referee(s) and send them the CV`,
      done: false,
      dueDate: due(REFEREE_LEAD_DAYS),
      sourceField: "referees",
    });
  }

  items.push(
    { item: "Approve the tailored CV", done: false, dueDate: due(lead), sourceField: "cv" },
    {
      item: "Write and approve the statement",
      done: false,
      dueDate: due(lead),
      sourceField: "statements",
    },
  );

  if (input.interview) {
    items.push({
      item: `Prepare for the interview: ${input.interview}`,
      done: false,
      dueDate: null,
      sourceField: "interview",
    });
  }

  items.push({
    item: deadline
      ? `Submit on the official portal before ${deadline}`
      : "Submit on the official portal",
    done: false,
    dueDate: deadline,
    sourceField: "deadline",
  });

  return items;
}

/** An ISO date this many days from a given day. */
export function addDays(from: string, days: number): string {
  const value = new Date(`${from}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Items due on or before the given date, soonest first. Undated items sort last. */
export function dueBy(items: readonly ChecklistItem[], date: string): ChecklistItem[] {
  return items
    .filter((item) => !item.done && item.dueDate !== null && item.dueDate <= date)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}

export function completion(items: readonly ChecklistItem[]): number {
  if (items.length === 0) return 0;
  return items.filter((item) => item.done).length / items.length;
}
