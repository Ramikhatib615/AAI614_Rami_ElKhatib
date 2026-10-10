import { describe, expect, it } from "vitest";

import { checkProgramExtraction } from "@/lib/ai/extract/program-page";
import { buildIcs, escapeIcsText, foldLine } from "@/lib/calendar/ics";
import { csvCell, toCsv } from "@/lib/export/csv";
import { diffPrograms } from "@/lib/programs/store";
import { scoreProgram } from "@/lib/scoring/program-fit";

const applicant = {
  hasMastersBy: "2027-02",
  englishTestTaken: false,
  greTaken: false,
  excludedRegions: [] as string[],
  regionPreferenceKnown: false,
};

const baseProgram = {
  researchAreas: ["machine learning"],
  degreeRequirement: "Master's degree",
  minGpa: null,
  englishTests: null,
  greRequired: "not_required" as const,
  fundingType: "Fully funded salaried position",
  internationalEligibility: "Open to international applicants",
  deadlines: [{ date: "2026-11-15", cycle: "2027 entry" }],
  region: "Europe",
  today: "2026-09-13",
  applicant,
};

describe("the program rubric", () => {
  it("scores a funded, open, well-timed language-model program highly", () => {
    const fit = scoreProgram({ ...baseProgram, researchAreas: ["natural language processing"] });
    expect(fit.score).toBeGreaterThan(60);
    expect(fit.components.find((c) => c.key === "funding")?.points).toBe(20);
  });

  it("gives nothing for funding it cannot establish, and says so", () => {
    const fit = scoreProgram({ ...baseProgram, fundingType: null });
    const funding = fit.components.find((c) => c.key === "funding");
    expect(funding?.points).toBe(0);
    expect(funding?.reason).toContain("cannot be scored");
  });

  it("marks the English test as the binding gap when one is required", () => {
    const fit = scoreProgram({ ...baseProgram, englishTests: { TOEFL: "100" } });
    expect(fit.components.find((c) => c.key === "eligibility")?.reason).toContain("binding gap");
  });

  it("scores a passed deadline at zero rather than assuming next year", () => {
    const fit = scoreProgram({
      ...baseProgram,
      deadlines: [{ date: "2025-11-15", cycle: "2026 entry" }],
    });
    const timing = fit.components.find((c) => c.key === "timing");
    expect(timing?.points).toBe(0);
    expect(timing?.reason).toContain("has passed");
  });

  it("flags a deadline that is days away as very tight", () => {
    const fit = scoreProgram({
      ...baseProgram,
      deadlines: [{ date: "2026-09-21", cycle: "autumn" }],
    });
    expect(fit.components.find((c) => c.key === "timing")?.reason).toContain("very tight");
  });

  it("cannot score region until Rami states his constraints", () => {
    const fit = scoreProgram(baseProgram);
    expect(fit.components.find((c) => c.key === "region")?.points).toBe(0);
    const known = scoreProgram({
      ...baseProgram,
      applicant: { ...applicant, regionPreferenceKnown: true, excludedRegions: ["US"] },
    });
    expect(known.components.find((c) => c.key === "region")?.points).toBe(10);
  });

  it("never exceeds 100", () => {
    const fit = scoreProgram({
      ...baseProgram,
      researchAreas: ["natural language processing", "remote sensing"],
      englishTests: { TOEFL: "100" },
      applicant: { ...applicant, englishTestTaken: true, regionPreferenceKnown: true },
    });
    expect(fit.score).toBeLessThanOrEqual(100);
  });
});

describe("extraction checks", () => {
  const base = {
    university: "Example University",
    programName: "PhD in Machine Learning",
    department: null,
    country: "Germany",
    degreeType: "PhD",
    researchAreas: [],
    admissionRoute: null,
    degreeRequirement: null,
    minGpa: null,
    englishTests: null,
    greRequired: "unknown" as const,
    documents: [],
    interview: null,
    fundingType: null,
    stipend: null,
    internationalEligibility: null,
    deadlines: [],
    startTerm: null,
    applicationUrl: null,
    notFound: [],
  };

  it("discards a dated deadline whose quote carries no date", () => {
    const checked = checkProgramExtraction({
      ...base,
      deadlines: [
        {
          label: "Application deadline",
          date: "2026-12-01",
          timezone: null,
          cycle: "2027 entry",
          sourceUrl: "https://example.edu/apply",
          evidence: "Applications are welcomed from prospective doctoral students.",
        },
      ],
    });
    expect(checked.value.deadlines).toHaveLength(0);
    expect(checked.redacted).toBe(true);
  });

  it("keeps a deadline whose quote prints the date", () => {
    const checked = checkProgramExtraction({
      ...base,
      deadlines: [
        {
          label: "Application deadline",
          date: "2026-12-01",
          timezone: "CET",
          cycle: "2027 entry",
          sourceUrl: "https://example.edu/apply",
          evidence: "The deadline is 1 December 2026 at 23:59 CET.",
        },
      ],
    });
    expect(checked.value.deadlines).toHaveLength(1);
  });

  it("discards funding whose quote does not support it", () => {
    const checked = checkProgramExtraction({
      ...base,
      fundingType: {
        value: "Fully funded four-year studentship",
        sourceUrl: "https://example.edu/phd",
        evidence: "The department welcomes applications from around the world.",
      },
    });
    expect(checked.value.fundingType).toBeNull();
  });

  it("warns when a page yielded no deadline at all", () => {
    const checked = checkProgramExtraction(base);
    expect(checked.warnings.join(" ")).toContain("No deadline was found");
  });
});

describe("diffing on refresh", () => {
  it("notices a moved deadline", () => {
    const existing = {
      deadlines: [{ label: "Deadline", date: "2026-11-15", timezone: null, cycle: "2027" }],
      fundingType: "Funded",
      degreeRequirement: "Master's",
      greRequired: "not_required" as const,
      documents: ["CV"],
    };
    const changed = diffPrograms(existing, {
      deadlines: [{ label: "Deadline", date: "2026-12-01", timezone: null, cycle: "2027" }],
    });
    expect(changed).toEqual(["deadlines"]);
  });

  it("reports nothing when the page is unchanged", () => {
    const existing = {
      deadlines: [],
      fundingType: "Funded",
      degreeRequirement: null,
      greRequired: "unknown" as const,
      documents: [],
    };
    expect(diffPrograms(existing, { fundingType: "Funded" })).toEqual([]);
  });
});

describe("calendar export", () => {
  const ics = buildIcs(
    [
      {
        uid: "abc@phd",
        date: "2026-09-21",
        summary: "ELLIS Institute Finland — Application deadline",
        description: "Status: unverified\nCheck the official page.",
        url: "https://www.ellisinstitute.fi/",
      },
    ],
    new Date("2026-09-13T10:00:00Z"),
  );

  it("produces a valid calendar envelope with CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics.split("\r\n").length).toBeGreaterThan(10);
  });

  it("writes an all-day event with an exclusive end date", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20260921");
    expect(ics).toContain("DTEND;VALUE=DATE:20260922");
    expect(ics).toContain("DTSTAMP:20260913T100000Z");
  });

  it("escapes the characters the format reserves", () => {
    expect(escapeIcsText("a, b; c\\d\ne")).toBe("a\\, b\; c\\\\d\\ne");
    expect(ics).toContain("Status: unverified\\nCheck the official page.");
  });

  it("folds a long line at 75 octets", () => {
    const folded = foldLine(`SUMMARY:${"x".repeat(200)}`);
    for (const line of folded.split("\r\n")) {
      expect(Buffer.from(line, "utf8").length).toBeLessThanOrEqual(76);
    }
    expect(folded).toContain("\r\n ");
  });

  it("keeps a deadline's unverified status visible in the calendar entry", () => {
    expect(ics).toContain("unverified");
  });
});

describe("csv export", () => {
  it("quotes a field containing a comma, and doubles inner quotes", () => {
    expect(csvCell("Trinity College, Dublin")).toBe('"Trinity College, Dublin"');
    expect(csvCell('He said "no"')).toBe('"He said ""no"""');
    expect(csvCell(null)).toBe("");
    expect(csvCell(["a", "b"])).toBe("a; b");
  });

  it("writes a header and one row per program", () => {
    const csv = toCsv([{ university: "A, B", fitScore: 72 }], ["university", "fitScore"]);
    expect(csv).toBe('university,fitScore\r\n"A, B",72\r\n');
  });
});
