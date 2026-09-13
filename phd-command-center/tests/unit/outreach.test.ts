import { describe, expect, it } from "vitest";

import type { RecentPaper } from "@/db/schema";
import { draftableFacts, outreachDraftSchema } from "@/lib/ai/generate/outreach";
import {
  CLICHES,
  canTransition,
  checkDraft,
  followUpDate,
  mailtoLink,
  mayFollowUp,
  wordCount,
} from "@/lib/outreach/rules";
import { SIMILARITY_BLOCK, compareAgainst, similarity } from "@/lib/outreach/similarity";

const paper = (id: string): RecentPaper => ({
  title: "Arabic dialect identification with small language models",
  year: 2026,
  venue: "ACL",
  url: `https://doi.org/10.1000/${id}`,
  doi: `10.1000/${id}`,
  openAlexId: `https://openalex.org/${id}`,
  verified: true,
});

function bodyOfWords(count: number, seed = "sentence about the work"): string {
  return Array.from({ length: count }, (_, index) =>
    index % 5 === 0 ? seed.split(" ")[0] : `w${index}`,
  ).join(" ");
}

const goodDraft = {
  subjectOptions: [
    "PhD enquiry, Fall 2027",
    "Doctoral study in Arabic NLP",
    "Prospective PhD student",
  ],
  body: bodyOfWords(180),
  factIdsUsed: ["interest.llm-nlp", "edu.msc.lau.headline"],
  paperIdsReferenced: ["https://openalex.org/W1"],
};

const baseInput = {
  papers: [paper("W1")],
  whyNotContact: null,
  otherDrafts: [],
};

describe("draft checks", () => {
  it("passes a draft that cites confirmed facts and a verified paper", () => {
    const check = checkDraft({ draft: goodDraft, ...baseInput });
    expect(check.errors).toEqual([]);
    expect(check.approvable).toBe(true);
  });

  it("blocks a draft that refers to a paper the professor does not have", () => {
    const check = checkDraft({
      draft: { ...goodDraft, paperIdsReferenced: ["https://openalex.org/W999"] },
      ...baseInput,
    });
    expect(check.approvable).toBe(false);
    expect(check.errors.some((issue) => issue.code === "unverified_paper")).toBe(true);
  });

  it("blocks a draft that refers to no paper at all", () => {
    const check = checkDraft({ draft: { ...goodDraft, paperIdsReferenced: [] }, ...baseInput });
    expect(check.errors.some((issue) => issue.code === "no_paper_cited")).toBe(true);
  });

  it("blocks a paper the record holds but has not verified", () => {
    const unverified: RecentPaper = { ...paper("W1"), verified: false };
    const check = checkDraft({ draft: goodDraft, ...baseInput, papers: [unverified] });
    expect(check.errors.some((issue) => issue.code === "unverified_paper")).toBe(true);
  });

  it("blocks a claim that cites a fact which does not exist", () => {
    const check = checkDraft({
      draft: { ...goodDraft, factIdsUsed: ["interest.llm-nlp", "exp.nobel.prize"] },
      ...baseInput,
    });
    expect(check.errors.some((issue) => issue.code === "unknown_fact")).toBe(true);
  });

  it("blocks a claim that rests on an unconfirmed fact", () => {
    const check = checkDraft({
      draft: { ...goodDraft, factIdsUsed: ["interest.llm-nlp", "exp.aub.headline"] },
      ...baseInput,
    });
    expect(check.errors.some((issue) => issue.code === "unconfirmed_fact")).toBe(true);
  });

  it("rejects every stock phrase", () => {
    for (const cliche of CLICHES) {
      const check = checkDraft({
        draft: { ...goodDraft, body: `${bodyOfWords(170)} ${cliche} and more` },
        ...baseInput,
      });
      expect(
        check.errors.some((issue) => issue.code === "cliche"),
        cliche,
      ).toBe(true);
    }
  });

  it("holds the letter between 150 and 220 words", () => {
    for (const count of [120, 260]) {
      const check = checkDraft({ draft: { ...goodDraft, body: bodyOfWords(count) }, ...baseInput });
      expect(check.errors.some((issue) => issue.code === "word_count")).toBe(true);
    }
    expect(wordCount(bodyOfWords(180))).toBe(180);
  });

  it("requires three subject lines", () => {
    const check = checkDraft({
      draft: { ...goodDraft, subjectOptions: ["one", "two"] },
      ...baseInput,
    });
    expect(check.errors.some((issue) => issue.code === "missing_subject")).toBe(true);
  });

  it("refuses outright when the page said not to contact them", () => {
    const check = checkDraft({
      draft: goodDraft,
      ...baseInput,
      whyNotContact: "I am not taking students and ask that you do not email me.",
    });
    expect(check.approvable).toBe(false);
    expect(check.errors[0].code).toBe("do_not_contact");
  });
});

describe("near-duplicate detection", () => {
  it("scores an identical body as fully overlapping", () => {
    expect(similarity("the same letter to everyone", "the same letter to everyone")).toBe(1);
  });

  it("scores unrelated bodies near zero", () => {
    expect(
      similarity("arabic dialect identification work", "satellite imagery land cover mapping"),
    ).toBeLessThan(0.1);
  });

  it("blocks a letter that is the same with the names swapped", () => {
    const first = `${bodyOfWords(180)} regards`;
    const second = first.replace("w5", "w6");
    const findings = compareAgainst(second, [{ id: "draft-1", body: first }]);
    expect(findings[0].score).toBeGreaterThanOrEqual(SIMILARITY_BLOCK);
    expect(findings[0].level).toBe("block");

    const check = checkDraft({
      draft: { ...goodDraft, body: second },
      ...baseInput,
      otherDrafts: [{ id: "draft-1", body: first }],
    });
    expect(check.approvable).toBe(false);
    expect(check.errors.some((issue) => issue.code === "too_similar")).toBe(true);
  });
});

describe("the workflow", () => {
  it("walks draft to sent and no further backwards", () => {
    expect(canTransition("draft", "reviewed")).toBe(true);
    expect(canTransition("reviewed", "approved")).toBe(true);
    expect(canTransition("approved", "sent_manually")).toBe(true);
    expect(canTransition("draft", "sent_manually")).toBe(false);
    expect(canTransition("closed", "draft")).toBe(false);
  });

  it("schedules one follow-up fourteen days out", () => {
    const sent = new Date("2026-09-13T10:00:00Z");
    expect(followUpDate(sent).toISOString()).toBe("2026-09-27T10:00:00.000Z");
    expect(mayFollowUp(0)).toBe(true);
    expect(mayFollowUp(1)).toBe(false);
  });

  it("builds a mailto link that can only open a mail client", () => {
    const link = mailtoLink({ to: "a@b.edu", subject: "PhD enquiry", body: "Hello there" });
    expect(link.startsWith("mailto:")).toBe(true);
    expect(link).toContain("subject=PhD+enquiry");
    // A mailto URL cannot transmit anything on its own.
    expect(link).not.toMatch(/^https?:/);
  });
});

describe("what the writer is allowed to see", () => {
  it("offers only confirmed, public facts", () => {
    for (const fact of draftableFacts()) {
      expect(fact.status).toBe("confirmed");
      expect(fact.visibility).toBe("public");
    }
  });

  it("withholds the unconfirmed AUB role and the private gaps", () => {
    const ids = draftableFacts().map((fact) => fact.id);
    expect(ids).not.toContain("exp.aub.headline");
    expect(ids).not.toContain("exp.aub.b1");
    expect(ids).not.toContain("gap.english-test");
    expect(ids).not.toContain("identity.phone");
  });

  it("includes the machine-learning work that the letters should lead with", () => {
    const ids = draftableFacts().map((fact) => fact.id);
    expect(ids).toContain("proj.fraud-detection.headline");
    expect(ids).toContain("interest.llm-nlp");
  });

  it("requires at least two facts and one paper at the schema level", () => {
    expect(
      outreachDraftSchema.safeParse({
        ...goodDraft,
        body: "x".repeat(250),
        factIdsUsed: ["one"],
        observation: "y".repeat(30),
      }).success,
    ).toBe(false);
  });
});
