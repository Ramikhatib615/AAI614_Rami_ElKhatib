import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", name: "home" },
  { path: "/research", name: "research" },
  { path: "/projects", name: "projects" },
  { path: "/experience", name: "experience" },
  { path: "/cv", name: "cv" },
  { path: "/contact", name: "contact" },
];

for (const page of pages) {
  test(`${page.name} passes axe and is captured`, async ({ page: browserPage }, testInfo) => {
    await browserPage.goto(page.path);
    // Let the hero's one load animation finish before capturing.
    await browserPage.waitForTimeout(1500);

    await browserPage.screenshot({
      path: `test-results/screens/${page.name}-${testInfo.project.name}.png`,
      fullPage: true,
    });

    const results = await new AxeBuilder({ page: browserPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test("every public page keeps its content within the viewport at 390px", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "mobile viewport only");
  for (const target of pages) {
    await page.goto(target.path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${target.path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
});

test("keyboard focus is visible on the first link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active) return null;
    const style = getComputedStyle(active);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(outline?.style).not.toBe("none");
  expect(parseFloat(outline?.width ?? "0")).toBeGreaterThan(0);
});
