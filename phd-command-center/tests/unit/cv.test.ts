import { describe, expect, it } from "vitest";

import { profile, type Profile } from "@/data/profile";
import { buildMasterCv } from "@/lib/cv/master";
import { diffCvDocuments } from "@/lib/cv/diff";
import { countPdfPages, cvFileName, renderCvPdf } from "@/lib/cv/pdf";
import { documentLines, type CvDocument } from "@/lib/cv/types";
import { checkCvDocument } from "@/lib/integrity/cv";

const master = buildMasterCv();

describe("the master CV", () => {
  it("gives every line at least one fact id", () => {
    for (const line of documentLines(master)) {
      if (!line.text.trim()) continue;
      expect(line.factIds.length, `"${line.text.slice(0, 50)}" cites nothing`).toBeGreaterThan(0);
    }
  });

  it("refuses to export today, because no contact address is confirmed", () => {
    const report = checkCvDocument(master);
    expect(report.exportable).toBe(false);
    expect(report.errors.map((issue) => issue.code)).toEqual(["no_contact"]);
  });

  it("becomes exportable as soon as an address is confirmed, with nothing else wrong", () => {
    const withEmail: Profile = {
      ...profile,
      identity: profile.identity.map((fact) =>
        fact.id === "identity.email.lau"
          ? { ...fact, status: "confirmed" as const, visibility: "public" as const }
          : fact,
      ),
    };
    const report = checkCvDocument(buildMasterCv(withEmail), withEmail);
    expect(report.errors).toEqual([]);
    expect(report.exportable).toBe(true);
  });

  it("leads the projects section with the machine-learning work", () => {
    const projects = master.sections.find((section) => section.id === "projects");
    expect(projects?.entries[0]?.id).toBe("proj.fraud-detection");
    expect(projects?.entries[1]?.id).toBe("proj.lulc");
  });

  it("omits the unconfirmed roles and records why", () => {
    const experience = master.sections.find((section) => section.id === "experience");
    expect(experience?.entries.map((entry) => entry.id)).not.toContain("exp.aub");
    const omitted = master.omissions.map((item) => item.factId);
    expect(omitted).toContain("exp.aub.headline");
    for (const omission of master.omissions) {
      expect(omission.reason.length).toBeGreaterThan(0);
    }
  });

  it("keeps private facts off the CV unless they are asked for", () => {
    const withoutPrivate = documentLines(buildMasterCv(profile, { includePrivate: false }));
    expect(withoutPrivate.some((line) => line.factIds.includes("identity.phone"))).toBe(false);

    const withPrivate = documentLines(
      buildMasterCv(profile, {
        includePrivate: true,
        privateValues: { PROFILE_PHONE: "+961 00 000 000" },
      }),
    );
    expect(withPrivate.some((line) => line.factIds.includes("identity.phone"))).toBe(true);
  });

  it("leaves out a private value that the environment does not supply", () => {
    const lines = documentLines(buildMasterCv(profile, { includePrivate: true }));
    expect(lines.some((line) => line.factIds.includes("identity.phone"))).toBe(false);
  });
});

describe("the integrity checker blocks export", () => {
  const lineIn = (document: CvDocument, text: string, factIds: string[]): CvDocument => ({
    ...document,
    sections: [
      {
        id: "test",
        heading: "Test",
        entries: [
          {
            id: "test.entry",
            heading: "Entry",
            factIds: ["edu.msc.lau.headline"],
            lines: [{ id: "test.line", text, factIds }],
          },
        ],
      },
    ],
  });

  it("when a line cites nothing", () => {
    const report = checkCvDocument(lineIn(master, "Led a team of forty engineers.", []));
    expect(report.exportable).toBe(false);
    expect(report.errors[0].code).toBe("line_without_fact");
  });

  it("when a line cites a fact that does not exist", () => {
    const report = checkCvDocument(lineIn(master, "Published in Nature.", ["proj.invented"]));
    expect(report.exportable).toBe(false);
    expect(report.errors.some((issue) => issue.code === "unknown_fact")).toBe(true);
  });

  it("when a line uses a fact that still needs confirmation", () => {
    const report = checkCvDocument(
      lineIn(master, "Data Scientist & Contract Officer at AUB.", ["exp.aub.headline"]),
    );
    expect(report.exportable).toBe(false);
    expect(report.errors.some((issue) => issue.code === "unconfirmed_fact")).toBe(true);
  });

  it("when two included roles overlap without a part-time flag", () => {
    // Confirm the OMT headline so it enters the CV, but leave its employment type unknown.
    const patched: Profile = {
      ...profile,
      experience: profile.experience.map((record) =>
        record.id === "exp.omt"
          ? { ...record, headline: { ...record.headline, status: "confirmed" as const } }
          : record,
      ),
    };
    const document = buildMasterCv(patched);
    const report = checkCvDocument(document, patched);
    expect(report.exportable).toBe(false);
    expect(report.errors.some((issue) => issue.code === "overlapping_dates")).toBe(true);
  });

  it("but only warns about a metric with no evidence, because that is Rami's call", () => {
    const patched: Profile = {
      ...profile,
      experience: profile.experience.map((record) =>
        record.id === "exp.aub"
          ? {
              ...record,
              headline: { ...record.headline, status: "confirmed" as const },
              employmentType: "part_time" as const,
              bullets: record.bullets.map((bullet) => ({
                ...bullet,
                status: "confirmed" as const,
              })),
            }
          : record,
      ),
    };
    const report = checkCvDocument(buildMasterCv(patched), patched);
    expect(report.warnings.some((issue) => issue.code === "metric_without_evidence")).toBe(true);
  });

  it("warns, rather than blocks, when the rendered CV runs past two pages", () => {
    const report = checkCvDocument(master, profile, { pageCount: 3 });
    expect(report.warnings.some((issue) => issue.code === "too_long")).toBe(true);
    // Length is Rami's call, so it never appears among the errors.
    expect(report.errors.some((issue) => issue.code === "too_long")).toBe(false);
  });
});

describe("the diff against a fully confirmed profile", () => {
  it("shows what answering the open questions would add", () => {
    const potential = buildMasterCv(profile, { includeUnconfirmed: true });
    const sections = diffCvDocuments(master, potential);
    const added = sections.flatMap((section) =>
      section.lines.filter((line) => line.change === "added").map((line) => line.id),
    );
    expect(added).toContain("exp.aub");
    expect(added.length).toBeGreaterThan(3);
  });
});

describe("the PDF", () => {
  it("renders a real PDF that fits on two pages", async () => {
    const pdf = await renderCvPdf(master, "Rami El Khatib");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const pages = countPdfPages(pdf);
    expect(pages).toBeGreaterThan(0);
    expect(pages, "an academic CV at this stage should be two pages").toBeLessThanOrEqual(2);
  }, 30_000);

  it("names files the way applications expect", () => {
    expect(cvFileName()).toBe("ElKhatib_Rami_CV_Master.pdf");
    expect(cvFileName("ELLIS Institute Finland")).toBe(
      "ElKhatib_Rami_CV_ELLIS-Institute-Finland.pdf",
    );
  });
});
