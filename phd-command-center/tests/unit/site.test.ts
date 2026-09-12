import { describe, expect, it } from "vitest";

import { profile } from "@/data/profile";
import {
  publishableEducation,
  publishableExperience,
  publishableProjects,
  publishableContacts,
  withheldFromPublicSite,
} from "@/lib/site";

describe("what the public site may show", () => {
  it("withholds a whole role when its title is unconfirmed", () => {
    const ids = publishableExperience().map((record) => record.id);
    // The AUB title, the NavLeb dates and the OMT employment type are all unconfirmed.
    expect(ids).not.toContain("exp.aub");
    expect(ids).not.toContain("exp.navleb");
    expect(ids).not.toContain("exp.omt");
    expect(ids).toContain("exp.escwa");
  });

  it("never leaks a bullet from a withheld role", () => {
    const shown = publishableExperience().flatMap((record) => record.bullets.map((b) => b.id));
    expect(shown.some((id) => id.startsWith("exp.aub."))).toBe(false);
    expect(shown.some((id) => id.startsWith("exp.omt."))).toBe(false);
  });

  it("drops unconfirmed bullets from a role it does show", () => {
    const escwa = publishableExperience().find((record) => record.id === "exp.escwa");
    expect(escwa).toBeDefined();
    for (const bullet of escwa?.bullets ?? []) {
      expect(bullet.status).toBe("confirmed");
    }
  });

  it("withholds the coursework project until Rami decides to show it", () => {
    const ids = publishableProjects().map((record) => record.id);
    expect(ids).not.toContain("proj.fraud-detection");
  });

  it("withholds an unconfirmed project link", () => {
    const lulc = publishableProjects().find((record) => record.id === "proj.lulc");
    expect(lulc?.links).toEqual([]);
  });

  it("publishes no contact address while none is confirmed", () => {
    expect(publishableContacts()).toEqual([]);
  });

  it("shows both degrees", () => {
    expect(publishableEducation().map((record) => record.id)).toEqual([
      "edu.msc.lau",
      "edu.bsc.liu",
    ]);
  });

  it("reports every withheld item with a reason", () => {
    const withheld = withheldFromPublicSite();
    expect(withheld.length).toBeGreaterThan(0);
    for (const item of withheld) {
      expect(item.reason.length).toBeGreaterThan(0);
    }
    expect(withheld.map((item) => item.id)).toContain("exp.aub");
  });

  it("hides every private fact from the education details", () => {
    const shown = publishableEducation().flatMap((record) => record.details.map((d) => d.id));
    expect(shown).not.toContain("edu.msc.lau.gpa");
    expect(profile.education[0].details.some((detail) => detail.id === "edu.msc.lau.gpa")).toBe(
      true,
    );
  });
});
