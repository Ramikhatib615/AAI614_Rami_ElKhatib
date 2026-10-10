import { describe, expect, it } from "vitest";

import { checkFacultyExtraction, facultyPageSchema } from "@/lib/ai/extract/faculty-page";
import { matchInterests } from "@/lib/scoring/interests";
import { scoreProfessor } from "@/lib/scoring/professor-fit";
import { retryAfterSeconds, SourceRateLimitError } from "@/lib/sources/http";
import { aggregateAuthors, toVerifiedPaper } from "@/lib/sources/openalex";

/**
 * Fixtures follow the documented OpenAlex Work shape (help.openalex.org/api/works). The live API
 * could not be called while writing these: it is metered now, and the shared address had no budget
 * left for the day.
 */
const work = (over: Record<string, unknown> = {}) => ({
  id: "https://openalex.org/W123",
  doi: "https://doi.org/10.1000/abcd",
  display_name: "Arabic language models for low-resource dialects",
  publication_year: 2026,
  type: "article",
  cited_by_count: 12,
  primary_location: { source: { display_name: "ACL" } },
  authorships: [
    {
      author: { id: "https://openalex.org/A1", display_name: "A. Researcher", orcid: null },
      institutions: [
        { id: "https://openalex.org/I1", display_name: "Example University", country_code: "DE" },
      ],
    },
  ],
  topics: [{ display_name: "Natural Language Processing" }],
  ...over,
});

describe("OpenAlex normalisation", () => {
  it("links a paper to its DOI landing page, not to anything a model produced", () => {
    const paper = toVerifiedPaper(work());
    expect(paper?.url).toBe("https://doi.org/10.1000/abcd");
    expect(paper?.doi).toBe("10.1000/abcd");
    expect(paper?.verified).toBe(true);
  });

  it("falls back to the OpenAlex record when there is no DOI", () => {
    const paper = toVerifiedPaper(work({ doi: null }));
    expect(paper?.url).toBe("https://openalex.org/W123");
  });

  it("every stored paper link is an https OpenAlex or DOI url", () => {
    const candidates = aggregateAuthors([
      work(),
      work({ id: "https://openalex.org/W2", doi: null }),
    ]);
    for (const candidate of candidates) {
      for (const paper of candidate.papers) {
        expect(paper.url).toMatch(/^https:\/\/(doi\.org|openalex\.org)\//);
      }
    }
  });

  it("drops a work with no title rather than inventing one", () => {
    expect(toVerifiedPaper(work({ display_name: null, title: null }))).toBeNull();
  });

  it("aggregates an author across their papers and keeps the affiliation", () => {
    const candidates = aggregateAuthors([
      work(),
      work({
        id: "https://openalex.org/W2",
        doi: null,
        topics: [{ display_name: "Remote Sensing" }],
      }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].papers).toHaveLength(2);
    expect(candidates[0].institutionName).toBe("Example University");
    expect(candidates[0].topics).toEqual(["Natural Language Processing", "Remote Sensing"]);
  });
});

describe("rate limiting", () => {
  it("reads OpenAlex's retryAfter out of the body", () => {
    expect(retryAfterSeconds({ retryAfter: 9592 }, new Headers())).toBe(9592);
  });

  it("falls back to the standard header, then to an hour", () => {
    expect(retryAfterSeconds(null, new Headers({ "retry-after": "120" }))).toBe(120);
    expect(retryAfterSeconds(null, new Headers())).toBe(3600);
  });

  it("carries the detail needed to explain the pause", () => {
    const error = new SourceRateLimitError("OpenAlex", 600, "Insufficient budget.");
    expect(error.retryAfterSeconds).toBe(600);
    expect(error.message).toContain("Insufficient budget");
  });
});

describe("the fit rubric", () => {
  const base = {
    papers: [{ year: 2026 }],
    recruitingSignal: null,
    linkedProgramFunded: null,
    currentYear: 2026,
  };

  it("scores a language-model group highest, because that is priority one", () => {
    const nlp = scoreProfessor({ ...base, topics: ["Natural Language Processing"] });
    const geo = scoreProfessor({ ...base, topics: ["Remote Sensing"] });
    expect(nlp.score).toBeGreaterThan(geo.score);
    expect(nlp.matchedInterests).toContain("interest.llm-nlp");
  });

  it("rewards the crossover Rami actually has", () => {
    const crossover = scoreProfessor({ ...base, topics: ["Deep Learning", "Remote Sensing"] });
    expect(crossover.components.find((c) => c.key === "crossover")?.points).toBe(10);
  });

  it("gives nothing for a recruiting signal that does not exist, and says so", () => {
    const fit = scoreProfessor({ ...base, topics: ["Natural Language Processing"] });
    const recruiting = fit.components.find((c) => c.key === "recruiting");
    expect(recruiting?.points).toBe(0);
    expect(recruiting?.reason).toContain("No published statement");
  });

  it("scores an explicit recruiting statement", () => {
    const fit = scoreProfessor({
      ...base,
      topics: ["Natural Language Processing"],
      recruitingSignal: {
        text: "I am taking PhD students for 2027.",
        url: "https://x.edu/a",
        date: null,
      },
    });
    expect(fit.components.find((c) => c.key === "recruiting")?.points).toBe(15);
  });

  it("never scores funding on an assumption", () => {
    const unknown = scoreProfessor({ ...base, topics: ["Machine Learning"] });
    const funding = unknown.components.find((c) => c.key === "funding");
    expect(funding?.points).toBe(0);
    expect(funding?.reason).toContain("cannot be scored");
  });

  it("decays with inactivity", () => {
    const fresh = scoreProfessor({
      ...base,
      topics: ["Machine Learning"],
      papers: [{ year: 2026 }],
    });
    const stale = scoreProfessor({
      ...base,
      topics: ["Machine Learning"],
      papers: [{ year: 2020 }],
    });
    expect(fresh.components.find((c) => c.key === "activity")?.points).toBe(15);
    expect(stale.components.find((c) => c.key === "activity")?.points).toBe(0);
  });

  it("never exceeds 100, and explains every component", () => {
    const fit = scoreProfessor({
      topics: ["Natural Language Processing", "Remote Sensing", "Humanitarian"],
      papers: [{ year: 2026 }],
      recruitingSignal: { text: "Taking students.", url: "https://x.edu/a", date: "2026-09-01" },
      linkedProgramFunded: true,
      currentYear: 2026,
    });
    expect(fit.score).toBeLessThanOrEqual(100);
    for (const component of fit.components) {
      expect(component.points).toBeLessThanOrEqual(component.max);
      expect(component.reason.length).toBeGreaterThan(0);
    }
  });

  it("matches topics case-insensitively and on substrings", () => {
    expect(matchInterests(["large language model evaluation"]).map((r) => r.rank)).toContain(1);
    expect(matchInterests(["Nothing Related At All"])).toEqual([]);
  });
});

describe("no email is ever guessed", () => {
  const valid = {
    currentPosition: null,
    department: null,
    labName: null,
    homepageUrl: null,
    officialEmail: null,
    recruitingSignal: null,
    doNotContact: null,
    notFound: [],
  };

  it("keeps an address that appears verbatim in its own quote", () => {
    const checked = checkFacultyExtraction({
      ...valid,
      officialEmail: {
        address: "a.researcher@example.edu",
        sourceUrl: "https://example.edu/people/researcher",
        evidence: "Contact: a.researcher@example.edu for enquiries.",
      },
    });
    expect(checked.value.officialEmail?.address).toBe("a.researcher@example.edu");
    expect(checked.redacted).toBe(false);
  });

  it("discards an address that does not appear in its quote", () => {
    const checked = checkFacultyExtraction({
      ...valid,
      officialEmail: {
        // The plausible pattern, with a quote that never contained it.
        address: "a.researcher@example.edu",
        sourceUrl: "https://example.edu/people/researcher",
        evidence: "A. Researcher is a professor in the Department of Computer Science.",
      },
    });
    expect(checked.value.officialEmail).toBeNull();
    expect(checked.redacted).toBe(true);
    expect(checked.warnings[0]).toContain("does not appear in its own supporting quote");
  });

  it("discards an obfuscated address rather than reconstructing it", () => {
    const checked = checkFacultyExtraction({
      ...valid,
      officialEmail: {
        address: "a.researcher@example.edu",
        sourceUrl: "https://example.edu/people/researcher",
        evidence: "Email: a.researcher [at] example [dot] edu",
      },
    });
    expect(checked.value.officialEmail).toBeNull();
  });

  it("requires a source url and a quote for an address at the schema level", () => {
    const missingSource = facultyPageSchema.safeParse({
      ...valid,
      officialEmail: { address: "a@b.edu" },
    });
    expect(missingSource.success).toBe(false);
  });

  it("discards a claimed position whose quote does not support it", () => {
    const checked = checkFacultyExtraction({
      ...valid,
      currentPosition: {
        value: "Full Professor",
        sourceUrl: "https://example.edu/people/researcher",
        evidence: "A. Researcher joined the department in 2019.",
      },
    });
    expect(checked.value.currentPosition).toBeNull();
    expect(checked.redacted).toBe(true);
  });

  it("warns when a page both recruits and says not to contact", () => {
    const checked = checkFacultyExtraction({
      ...valid,
      recruitingSignal: { text: "Taking students.", url: "https://x.edu/a", date: null },
      doNotContact: { text: "Please do not email me about PhD positions.", url: "https://x.edu/a" },
    });
    expect(checked.warnings.join(" ")).toContain("do-not-contact");
  });
});
