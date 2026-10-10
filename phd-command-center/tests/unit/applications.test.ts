import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEAD_DAYS,
  REFEREE_LEAD_DAYS,
  TEST_LEAD_DAYS,
  addDays,
  buildChecklist,
  completion,
  dueBy,
  earliestDeadline,
} from "@/lib/applications/checklist";
import {
  canTransitionStatement,
  checkStatement,
  DEFAULT_WORD_LIMITS,
} from "@/lib/statements/rules";

const applicant = { englishTestTaken: false, greTaken: false, refereesConfirmed: 0 };

const program = {
  documents: ["CV", "Statement of purpose", "Transcripts"],
  englishTests: { TOEFL: "100" },
  greRequired: "required" as const,
  interview: "Screening exam and interview",
  deadlines: [{ label: "Deadline", date: "2026-12-01" }],
  applicant,
};

describe("checklist generation", () => {
  const items = buildChecklist(program);

  it("lists exactly the documents the program asks for", () => {
    for (const document of program.documents) {
      expect(items.some((item) => item.item === document)).toBe(true);
    }
    // Nothing invented: no item mentions a portfolio, which this program never asked for.
    expect(items.some((item) => /portfolio/i.test(item.item))).toBe(false);
  });

  it("dates documents two weeks before the deadline", () => {
    const cv = items.find((item) => item.item === "CV");
    expect(cv?.dueDate).toBe(addDays("2026-12-01", -DEFAULT_LEAD_DAYS));
  });

  it("gives the English test ninety days, because results take weeks", () => {
    const english = items.find((item) => item.sourceField === "englishTests");
    expect(english?.item).toContain("Book and sit");
    expect(english?.dueDate).toBe(addDays("2026-12-01", -TEST_LEAD_DAYS));
  });

  it("gives referees six weeks, because asking later is rude", () => {
    const referees = items.find((item) => item.sourceField === "referees");
    expect(referees?.dueDate).toBe(addDays("2026-12-01", -REFEREE_LEAD_DAYS));
    expect(referees?.item).toContain("3 more referee");
  });

  it("asks to confirm an unknown GRE requirement rather than assuming", () => {
    const unknown = buildChecklist({ ...program, greRequired: "unknown" });
    expect(unknown.some((item) => item.item.includes("Confirm on the official page"))).toBe(true);
  });

  it("omits the GRE entirely when the program does not want one", () => {
    const none = buildChecklist({ ...program, greRequired: "not_required" });
    expect(none.some((item) => /GRE/.test(item.item))).toBe(false);
  });

  it("skips the English item when the program states no requirement", () => {
    const none = buildChecklist({ ...program, englishTests: null });
    expect(none.some((item) => item.sourceField === "englishTests")).toBe(false);
  });

  it("leaves every date null when the program has published none", () => {
    const undated = buildChecklist({ ...program, deadlines: [{ label: "Deadline", date: null }] });
    expect(undated.every((item) => item.dueDate === null)).toBe(true);
    expect(earliestDeadline([{ date: null }])).toBeNull();
  });

  it("always ends with submitting on the official portal, by hand", () => {
    expect(items.at(-1)?.item).toContain("Submit on the official portal");
  });

  it("reports what is due and how far along it is", () => {
    expect(dueBy(items, "2026-09-13").length).toBeGreaterThan(0);
    expect(completion(items)).toBe(0);
    expect(completion(items.map((item) => ({ ...item, done: true })))).toBe(1);
  });
});

describe("statement checks", () => {
  const body = Array.from({ length: 600 }, (_, index) => `word${index}`).join(" ");

  it("blocks a statement over the program's word limit", () => {
    const check = checkStatement({
      body,
      factIdsUsed: ["interest.llm-nlp"],
      wordLimit: 500,
      status: "draft",
    });
    expect(check.approvable).toBe(false);
    expect(check.errors.some((issue) => issue.code === "over_limit")).toBe(true);
  });

  it("warns when it leaves half the allowance unused", () => {
    const check = checkStatement({
      body,
      factIdsUsed: ["interest.llm-nlp"],
      wordLimit: 1500,
      status: "draft",
    });
    expect(check.warnings.some((issue) => issue.code === "too_short")).toBe(true);
  });

  it("blocks an unconfirmed or invented fact", () => {
    expect(
      checkStatement({
        body,
        factIdsUsed: ["exp.aub.headline"],
        wordLimit: 1000,
        status: "draft",
      }).errors.some((issue) => issue.code === "unconfirmed_fact"),
    ).toBe(true);
    expect(
      checkStatement({
        body,
        factIdsUsed: ["exp.invented"],
        wordLimit: 1000,
        status: "draft",
      }).errors.some((issue) => issue.code === "unknown_fact"),
    ).toBe(true);
  });

  it("says a statement needs editing until Rami approves it", () => {
    expect(
      checkStatement({ body, factIdsUsed: ["interest.llm-nlp"], wordLimit: 1000, status: "draft" })
        .requiresEdit,
    ).toBe(true);
    expect(
      checkStatement({
        body,
        factIdsUsed: ["interest.llm-nlp"],
        wordLimit: 1000,
        status: "approved",
      }).requiresEdit,
    ).toBe(false);
  });

  it("only reaches approved by way of an edit", () => {
    expect(canTransitionStatement("draft", "approved")).toBe(false);
    expect(canTransitionStatement("edited", "approved")).toBe(true);
  });

  it("carries a default limit for every statement type", () => {
    for (const kind of ["sop", "research_statement", "motivation_letter", "cover_letter"]) {
      expect(DEFAULT_WORD_LIMITS[kind]).toBeGreaterThan(0);
    }
  });
});
