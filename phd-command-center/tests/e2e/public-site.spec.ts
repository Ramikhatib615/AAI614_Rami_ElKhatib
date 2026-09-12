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

  test("no unconfirmed claim reaches the public HTML", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    // exp.aub.b1 and the positioning sentence both still need confirmation.
    expect(html).not.toContain("40 percent");
    expect(html).not.toContain("measuring the physical world");
  });

  test("the page does not scroll sideways at 390px", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
