import { test, expect } from "@playwright/test";

test.describe("Landing page (LiquidPlayground)", () => {
  test("loads and shows PAPI HAIR DESIGN brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/PAPI HAIR/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("sticky header is visible on scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(600);
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
  });

  test("nav buttons are present in header", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(600);
    const navButtons = page.locator("header nav button");
    await expect(navButtons.first()).toBeVisible({ timeout: 10000 });
    expect(await navButtons.count()).toBeGreaterThanOrEqual(4);
  });

  test("REZERVOVAŤ button navigates to /booking", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const calendarBtn = page.locator("header button[aria-label]").first();
    await expect(calendarBtn).toBeVisible({ timeout: 10000 });
    await calendarBtn.click();
    await expect(page).toHaveURL(/\/booking/, { timeout: 10000 });
  });

  test("language toggle is present in header", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("header").getByRole("button", { name: /switch language|zmeniť jazyk/i })).toBeVisible({ timeout: 10000 });
  });

  test("no horizontal overflow on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
