import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("the home page names Rami and lists his research interests", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Rami El Khatib" })).toBeVisible();
    await expect(page.getByText("Large language models")).toBeVisible();
  });

  test("no phone number reaches the public HTML", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    // Any Lebanese mobile pattern, spaced or not. The number itself is never written here:
    // this repository may be public, so the test matches a shape, and checks the real value only
    // when it is present in the environment.
    expect(html).not.toMatch(/\+?961[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{3}/);
    const phone = process.env.PROFILE_PHONE;
    if (phone) {
      expect(html).not.toContain(phone);
      expect(html).not.toContain(phone.replace(/\D/g, ""));
    }
  });

  const publicPages = ["/", "/research", "/projects", "/experience", "/cv", "/contact"];

  // Every phrase below belongs to a fact that is still `needs_confirmation`, so none of them may
  // appear anywhere on the public site.
  const withheldPhrases = [
    "40 percent", // exp.aub.b1, metric with no evidence
    "100 percent data accuracy", // exp.aub.b2-metric
    "measuring the physical world", // positioning sentence, not approved
    "Contract Officer", // the AUB title, unconfirmed with HR
    "Western Union", // exp.omt, employment type unresolved
    "NavLeb", // exp.navleb, dates unresolved
    "@lau.edu", // no permanent address confirmed
    "ESRI", // certification names unconfirmed
  ];

  for (const path of publicPages) {
    test(`no unconfirmed claim reaches ${path}`, async ({ page }) => {
      await page.goto(path);
      const html = await page.content();
      for (const phrase of withheldPhrases) {
        expect(html, `${path} leaks "${phrase}"`).not.toContain(phrase);
      }
    });
  }

  test("the sitemap lists the public pages and robots.txt blocks the dashboard", async ({
    request,
  }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of publicPages.filter((p) => p !== "/")) {
      expect(sitemap).toContain(path);
    }
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /dashboard");
  });

  test("the home page carries Person structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(jsonLd ?? "{}");
    expect(data["@type"]).toBe("Person");
    expect(data.name).toBe("Rami El Khatib");
    expect(data.alumniOf).toHaveLength(2);
    // sameAs is withheld: the LinkedIn, GitHub and ORCID urls are not confirmed.
    expect(data.sameAs).toBeUndefined();
  });

  test("the page does not scroll sideways at 390px", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
