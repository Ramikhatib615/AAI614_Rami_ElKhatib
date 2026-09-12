import { expect, test } from "@playwright/test";

test.describe("the command center is private", () => {
  test("a signed-out visitor is redirected away from the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?from=%2Fdashboard$/);
    await expect(page.getByRole("heading", { name: "Command center" })).toBeVisible();
  });

  test("a signed-out visitor is redirected from a nested dashboard route", async ({ page }) => {
    await page.goto("/dashboard/professors");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("private routes are marked noindex", async ({ request }) => {
    const response = await request.get("/dashboard", { maxRedirects: 0 });
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("a private api route answers 401 rather than data", async ({ request }) => {
    const response = await request.get("/api/jobs");
    expect([401, 404]).toContain(response.status());
  });
});

test.describe("AI endpoints are private and never auto-send", () => {
  test("the worker refuses a request without the cron secret", async ({ request }) => {
    const response = await request.get("/api/cron/worker");
    expect(response.status()).toBe(401);
  });

  test("the queue drain is not reachable when signed out", async ({ request }) => {
    const response = await request.post("/api/jobs/drain");
    expect(response.status()).toBe(401);
  });

  test("the CV export is not reachable when signed out", async ({ request }) => {
    const response = await request.get("/api/cv/export");
    expect(response.status()).toBe(401);
  });
});
