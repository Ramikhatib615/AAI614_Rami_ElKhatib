import { describe, expect, it } from "vitest";

import {
  allFacts,
  factById,
  profile,
  publicFacts,
  privateValueKeys,
  type Fact,
} from "@/data/profile";
import { checkFactIds, isPublishable } from "@/lib/integrity/facts";
import { coveredMonths, findEmploymentOverlaps, monthIndex } from "@/lib/integrity/dates";

const NOW = "2026-09";

describe("profile facts", () => {
  it("gives every fact a unique id", () => {
    const ids = allFacts().map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every fact non-empty text", () => {
    const empty = allFacts().filter((fact) => fact.text.trim().length === 0);
    expect(empty).toEqual([]);
  });

  it("explains every fact that needs confirmation", () => {
    const unexplained = allFacts()
      .filter((fact) => fact.status === "needs_confirmation" && !fact.note)
      .map((fact) => fact.id);
    expect(unexplained).toEqual([]);
  });

  it("only publishes facts that are public and confirmed", () => {
    for (const fact of publicFacts()) {
      expect(isPublishable(fact)).toBe(true);
      expect(fact.visibility).toBe("public");
      expect(fact.status).toBe("confirmed");
    }
  });

  it("keeps unconfirmed facts out of the public set", () => {
    const publicIds = new Set(publicFacts().map((fact) => fact.id));
    expect(publicIds.has("positioning.surveying-to-modelling")).toBe(false);
    expect(publicIds.has("exp.aub.headline")).toBe(false);
    expect(publicIds.has("exp.aub.b1")).toBe(false);
  });

  it("keeps private facts out of the public set", () => {
    const publicIds = new Set(publicFacts().map((fact) => fact.id));
    expect(publicIds.has("identity.phone")).toBe(false);
    expect(publicIds.has("edu.msc.lau.gpa")).toBe(false);
    for (const gap of profile.gaps) {
      expect(publicIds.has(gap.id)).toBe(false);
    }
  });

  it("stores no phone number in the repository", () => {
    const phone = factById("identity.phone") as Fact;
    expect(phone.valueFrom).toBe("PROFILE_PHONE");
    // The committed text must carry no digits at all.
    expect(phone.text).not.toMatch(/\d/);
    expect(privateValueKeys()).toContain("PROFILE_PHONE");
  });

  it("marks every unevidenced metric as needing confirmation", () => {
    const offenders = allFacts()
      .filter(
        (fact) =>
          fact.metrics?.some((metric) => metric.evidence === null) && fact.status === "confirmed",
      )
      .map((fact) => fact.id);
    expect(offenders).toEqual([]);
  });

  it("points every open confirmation at real fact ids", () => {
    const ids = new Set(allFacts().map((fact) => fact.id));
    for (const item of profile.openConfirmations) {
      for (const blocked of item.blocks) {
        expect(ids.has(blocked), `${item.id} blocks unknown fact ${blocked}`).toBe(true);
      }
    }
  });

  it("uses well-formed dates with start before end", () => {
    const records = [...profile.education, ...profile.experience];
    for (const record of records) {
      const start = monthIndex(record.start);
      const end = record.end ? monthIndex(record.end) : monthIndex(NOW);
      expect(end, `${record.id} ends before it starts`).toBeGreaterThanOrEqual(start);
    }
  });
});

describe("checkFactIds", () => {
  it("passes a confirmed fact", () => {
    const result = checkFactIds(["exp.escwa.b1"]);
    expect(result.ok).toBe(true);
    expect(result.resolved).toHaveLength(1);
  });

  it("rejects an invented fact id", () => {
    const result = checkFactIds(["exp.escwa.b1", "exp.invented.nobel-prize"]);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["exp.invented.nobel-prize"]);
  });

  it("rejects a fact that still needs confirmation", () => {
    const result = checkFactIds(["exp.aub.headline"]);
    expect(result.ok).toBe(false);
    expect(result.unconfirmed).toEqual(["exp.aub.headline"]);
  });

  it("reports metrics with no evidence", () => {
    const result = checkFactIds(["exp.aub.b1"]);
    expect(result.unevidencedMetrics).toEqual(["exp.aub.b1"]);
  });
});

describe("employment date integrity", () => {
  it("flags the OMT overlap until its employment type is confirmed", () => {
    const warnings = findEmploymentOverlaps(profile, NOW);
    const omt = warnings.filter((warning) => warning.a === "exp.omt" || warning.b === "exp.omt");
    expect(omt.length).toBeGreaterThan(0);
    expect(omt.some((warning) => warning.message.includes("no confirmed employment type"))).toBe(
      true,
    );
  });

  it("clears the overlap once the role is marked part-time", () => {
    const patched = {
      ...profile,
      experience: profile.experience.map((record) =>
        record.id === "exp.omt" ? { ...record, employmentType: "part_time" as const } : record,
      ),
    };
    const warnings = findEmploymentOverlaps(patched, NOW);
    expect(warnings.filter((w) => w.a === "exp.omt" || w.b === "exp.omt")).toEqual([]);
  });

  it("does not support a claim of five or more years of data and GIS experience", () => {
    // Counting only the data/GIS roles, overlaps counted once.
    const dataRoles = profile.experience.filter((record) => record.id !== "exp.omt");
    const months = coveredMonths(dataRoles, NOW);
    expect(months).toBeLessThan(60);
    // And no fact in the profile claims a number of years.
    const claims = allFacts().filter((fact) => /\b\d+\+?\s*years?\b/i.test(fact.text));
    expect(claims).toEqual([]);
  });
});
