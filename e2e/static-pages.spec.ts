import { test, expect } from "@playwright/test";

test.describe("Static pages", () => {
  test("privacy page renders GDPR heading", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /Zásady ochrany osobných údajov/i })).toBeVisible({ timeout: 15000 });
  });

  test("privacy page has back link to home", async ({ page }) => {
    await page.goto("/privacy");
    const backLink = page.getByRole("link", { name: /Späť na úvod/i });
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await backLink.click();
    await expect(page).toHaveURL(/\/$|\/papihairdesign/, { timeout: 10000 });
  });

  test("terms page renders heading", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /Zmluvné podmienky|Terms/i })).toBeVisible({ timeout: 15000 });
  });

  test("terms page has link to privacy policy", async ({ page }) => {
    await page.goto("/terms");
    const privacyLink = page.getByRole("link", { name: /Zásady ochrany osobných údajov/i });
    await expect(privacyLink).toBeVisible({ timeout: 10000 });
    await privacyLink.click();
    await expect(page).toHaveURL(/\/privacy/, { timeout: 10000 });
  });

  test("404 page renders not found text", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz");
    await expect(page.getByText(/404|nenájdená|not found/i)).toBeVisible({ timeout: 15000 });
  });

  test("privacy page has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/privacy");
    await page.waitForLoadState("domcontentloaded");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
