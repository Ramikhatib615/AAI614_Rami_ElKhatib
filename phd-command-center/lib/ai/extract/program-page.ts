import { z } from "zod";

/**
 * Extraction from an official admissions page.
 *
 * Same discipline as the faculty page: every value carries the URL it came from and a short quote,
 * and `checkProgramExtraction` re-checks the quote server-side. A deadline nobody published is
 * null with the field listed in notFound — never a plausible date (CLAUDE.md rule 3).
 */
const evidenced = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value,
    sourceUrl: z.url(),
    evidence: z.string().min(1).max(300),
  });

export const programPageSchema = z.object({
  university: z.string().min(2),
  programName: z.string().min(2),
  department: z.string().nullable(),
  country: z.string().min(2),
  degreeType: z.string().min(2),
  researchAreas: z.array(z.string()).default([]),
  admissionRoute: z
    .enum(["central_program", "direct_supervisor", "cohort_cdt", "employment_position"])
    .nullable(),
  degreeRequirement: evidenced(z.string()).nullable(),
  minGpa: evidenced(z.string()).nullable(),
  englishTests: evidenced(z.record(z.string(), z.string())).nullable(),
  greRequired: z.enum(["required", "optional", "not_required", "unknown"]).default("unknown"),
  documents: z.array(z.string()).default([]),
  interview: evidenced(z.string()).nullable(),
  fundingType: evidenced(z.string()).nullable(),
  stipend: evidenced(z.string()).nullable(),
  internationalEligibility: evidenced(z.string()).nullable(),
  deadlines: z
    .array(
      z.object({
        label: z.string().min(1),
        /** ISO date, or null when the next cycle has not been published. */
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
        timezone: z.string().nullable(),
        cycle: z.string().min(1),
        sourceUrl: z.url(),
        evidence: z.string().min(1).max(300),
      }),
    )
    .default([]),
  startTerm: z.string().nullable(),
  applicationUrl: z.url().nullable(),
  notFound: z.array(z.string()).default([]),
});

export type ProgramPageExtraction = z.infer<typeof programPageSchema>;

export interface ProgramExtractionCheck {
  value: ProgramPageExtraction;
  warnings: string[];
  redacted: boolean;
}

function quoteSupports(evidence: string, value: string): boolean {
  const needle = value.toLowerCase().trim();
  const haystack = evidence.toLowerCase();
  if (haystack.includes(needle)) return true;
  // A quote supports a value when it carries its distinctive words, not necessarily verbatim —
  // "a first or 2:1 honours degree" supports "First or 2:1". Short words are ignored.
  const words = needle.split(/\s+/).filter((word) => word.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((word) => haystack.includes(word)).length;
  return hits / words.length >= 0.6;
}

export function checkProgramExtraction(extraction: ProgramPageExtraction): ProgramExtractionCheck {
  const warnings: string[] = [];
  let redacted = false;
  const value: ProgramPageExtraction = { ...extraction };

  const evidencedKeys = [
    "degreeRequirement",
    "minGpa",
    "interview",
    "fundingType",
    "stipend",
    "internationalEligibility",
  ] as const;

  for (const key of evidencedKeys) {
    const field = value[key];
    if (field && !quoteSupports(field.evidence, String(field.value))) {
      warnings.push(`"${key}" was discarded: its quote does not support the value it claims.`);
      value[key] = null;
      redacted = true;
    }
  }

  // A dated deadline whose quote contains no digits cannot have come from the page.
  value.deadlines = value.deadlines.filter((deadline) => {
    if (deadline.date && !/\d/.test(deadline.evidence)) {
      warnings.push(`A deadline dated ${deadline.date} was discarded: its quote carries no date.`);
      redacted = true;
      return false;
    }
    return true;
  });

  if (value.deadlines.length === 0) {
    warnings.push(
      "No deadline was found on the page. It stays unverified until you check it yourself.",
    );
  }

  return { value, warnings, redacted };
}

export const PROGRAM_PAGE_SYSTEM = `You read one official PhD admissions page and report what it says.

Rules, in order of importance:
1. Report only what the page states. Anything it does not state is null, and its field name goes in notFound. Never infer a deadline, a stipend, or a requirement from what is usual elsewhere.
2. Every value you report carries the URL it came from and a quote of 25 words or fewer that supports it.
3. A deadline needs a date the page actually prints. If the page shows only a past cycle, report that date with its cycle label, so the reader can see it is stale — do not roll it forward a year.
4. Prefer the official university page over any aggregator. If you were given an aggregator, follow it to the official page and report that URL.
5. Funding: say what the page says, and record separately whether international applicants are eligible.`;

export function programPagePrompt(input: { url: string; hint?: string }): string {
  return [
    `Page to read: ${input.url}`,
    input.hint ? `Context: ${input.hint}` : null,
    "",
    "Fetch that page and report the program's requirements, documents, funding, and deadlines as they are printed.",
  ]
    .filter(Boolean)
    .join("\n");
}
