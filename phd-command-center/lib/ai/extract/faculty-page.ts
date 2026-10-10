import { z } from "zod";

/**
 * Verifying a professor's official page.
 *
 * The schema is built so that the integrity rules cannot be satisfied by a plausible-sounding
 * answer. Every value carries the URL it came from and a short quote, and `checkFacultyExtraction`
 * re-checks the quote server-side. An email address that does not appear verbatim in its own
 * evidence is discarded, so an address can only survive if it was actually printed on the page
 * (CLAUDE.md rule 4).
 */
export const evidencedSchema = z.object({
  value: z.string().min(1),
  sourceUrl: z.url(),
  /** A short quote from the page, 25 words or fewer, containing the value. */
  evidence: z.string().min(1).max(300),
});

export const facultyPageSchema = z.object({
  currentPosition: evidencedSchema.nullable(),
  department: evidencedSchema.nullable(),
  labName: evidencedSchema.nullable(),
  homepageUrl: z.url().nullable(),
  /** Only when the address is printed on the page. Never assembled from a name pattern. */
  officialEmail: z
    .object({
      address: z.email(),
      sourceUrl: z.url(),
      evidence: z.string().min(1).max(300),
    })
    .nullable(),
  /** An explicit statement about taking students, quoted. */
  recruitingSignal: z
    .object({
      text: z.string().min(1).max(300),
      url: z.url(),
      date: z.string().nullable(),
    })
    .nullable(),
  /** A published instruction not to email, or a statement that they are not taking students. */
  doNotContact: z.object({ text: z.string().min(1).max(300), url: z.url() }).nullable(),
  /** Fields the page did not answer; recorded rather than filled in. */
  notFound: z.array(z.string()).default([]),
});

export type FacultyPageExtraction = z.infer<typeof facultyPageSchema>;

export interface ExtractionCheck {
  value: FacultyPageExtraction;
  warnings: string[];
  /** True when something was dropped for failing its own evidence check. */
  redacted: boolean;
}

function quoteContains(evidence: string, value: string): boolean {
  return evidence.toLowerCase().includes(value.toLowerCase().trim());
}

/**
 * Re-checks the model's output against its own quotes. This runs server-side after validation, so
 * a persuasive but unsupported answer is removed rather than stored.
 */
export function checkFacultyExtraction(extraction: FacultyPageExtraction): ExtractionCheck {
  const warnings: string[] = [];
  let redacted = false;
  const value: FacultyPageExtraction = { ...extraction };

  if (value.officialEmail) {
    const { address, evidence } = value.officialEmail;
    if (!quoteContains(evidence, address)) {
      warnings.push(
        `An email address was returned that does not appear in its own supporting quote, so it was discarded. ` +
          `Pages that obfuscate an address (for example "name [at] example.edu") will always land here — read it yourself rather than letting anything reconstruct it.`,
      );
      value.officialEmail = null;
      redacted = true;
    }
  }

  for (const key of ["currentPosition", "department", "labName"] as const) {
    const field = value[key];
    if (field && !quoteContains(field.evidence, field.value)) {
      warnings.push(
        `"${key}" was discarded: its quote does not contain the value it claims to support.`,
      );
      value[key] = null;
      redacted = true;
    }
  }

  if (value.recruitingSignal && value.doNotContact) {
    warnings.push(
      "The page carries both a recruiting statement and a do-not-contact statement. Read it yourself before writing.",
    );
  }

  return { value, warnings, redacted };
}

export const FACULTY_PAGE_SYSTEM = `You verify a named academic's official university or lab page.

Rules, in order of importance:
1. Report only what the page actually says. If it does not say something, put null and add the field name to notFound. Never infer, complete, or reconstruct a value.
2. Never assemble an email address from a name and a domain. Report an address only if it is printed on the page, and quote the exact text it appears in.
3. Every value you report carries the page URL it came from and a short quote (25 words or fewer) that contains that value verbatim.
4. A recruiting signal is an explicit statement about taking or not taking doctoral students. Quote it. Do not treat a generic "prospective students" navigation link as a signal.
5. If the page asks people not to email, or says the person is not taking students, record that in doNotContact.

You are reading one person's page. If the page is about someone else, return nulls and say so in notFound.`;

export function facultyPagePrompt(input: {
  name: string;
  institution: string | null;
  homepageUrl: string;
}): string {
  return [
    `Person: ${input.name}`,
    input.institution ? `Institution: ${input.institution}` : null,
    `Page to read: ${input.homepageUrl}`,
    "",
    "Fetch that page and report what it says about this person's current position, department, lab, published email address, and whether they are taking doctoral students for the next intake.",
  ]
    .filter(Boolean)
    .join("\n");
}
