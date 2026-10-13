import { describe, expect, it } from "vitest";

import { seedPrograms } from "@/data/seed-programs";

describe("seed programs", () => {
  it("has a unique slug per program", () => {
    const slugs = seedPrograms.map((program) => program.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("ships everything unverified and never verified", () => {
    for (const program of seedPrograms) {
      expect(program.provenance).toBe("prompt_seed");
    }
  });

  it("cites at least one source per program", () => {
    for (const program of seedPrograms) {
      expect(program.sources.length, `${program.slug} has no source`).toBeGreaterThan(0);
    }
  });

  it("keeps every evidence snippet to 25 words or fewer", () => {
    for (const program of seedPrograms) {
      for (const source of program.sources) {
        const words = source.evidenceSnippet.trim().split(/\s+/).length;
        expect(words, `${program.slug}: "${source.evidenceSnippet}"`).toBeLessThanOrEqual(25);
      }
    }
  });

  it("uses https urls for sources and applications", () => {
    for (const program of seedPrograms) {
      expect(program.applicationUrl.startsWith("https://"), program.slug).toBe(true);
      for (const source of program.sources) {
        expect(source.url.startsWith("https://"), program.slug).toBe(true);
      }
    }
  });

  it("marks every source as not yet fetched, since none was", () => {
    for (const program of seedPrograms) {
      for (const source of program.sources) {
        expect(source.fetchedAt).toBeNull();
      }
    }
  });

  it("uses ISO dates for any deadline that has one, and a note where it does not", () => {
    for (const program of seedPrograms) {
      expect(program.deadlines.length, `${program.slug} has no deadline entry`).toBeGreaterThan(0);
      for (const deadline of program.deadlines) {
        if (deadline.date === null) {
          expect(deadline.cycle.length, `${program.slug} needs a cycle label`).toBeGreaterThan(0);
        } else {
          expect(deadline.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(Number.isNaN(Date.parse(deadline.date))).toBe(false);
        }
      }
    }
  });
});
