import { describe, expect, it } from "vitest";

import { allCopyEntries, interestEvidenceTags } from "@/lib/copy";
import { allFacts, profile } from "@/data/profile";
import { checkFactIds } from "@/lib/integrity/facts";

describe("site copy", () => {
  it("traces every sentence to confirmed facts", () => {
    for (const entry of allCopyEntries) {
      const result = checkFactIds(entry.factIds);
      expect(result.missing, `${entry.id} cites facts that do not exist`).toEqual([]);
      expect(result.unconfirmed, `${entry.id} cites unconfirmed facts`).toEqual([]);
    }
  });

  it("cites at least one fact per sentence", () => {
    for (const entry of allCopyEntries) {
      expect(entry.factIds.length, `${entry.id} cites nothing`).toBeGreaterThan(0);
    }
  });

  it("maps every research interest to an evidence rule", () => {
    for (const interest of profile.interests) {
      expect(Object.hasOwn(interestEvidenceTags, interest.id), `${interest.id} has no rule`).toBe(
        true,
      );
    }
  });

  it("uses tags that exist on real facts", () => {
    const known = new Set(allFacts().flatMap((fact) => fact.tags ?? []));
    for (const tags of Object.values(interestEvidenceTags)) {
      for (const tag of tags) {
        expect(known.has(tag), `no fact carries the tag "${tag}"`).toBe(true);
      }
    }
  });
});
