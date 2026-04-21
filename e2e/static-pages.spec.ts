import { test, expect } from "@playwright/test";

test.describe("Static pages", () => {
  test("privacy page renders core heading and GDPR section", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /Ochrana súkromia/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Vaše práva \(GDPR\)/i })).toBeVisible({ timeout: 15000 });
  });

  test("privacy page exposes booking CTA and sticky header", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("public-sticky-header")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /Rezervovať termín/i }).last()).toBeVisible({ timeout: 10000 });
  });

  test("demo page renders sticky header shell", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByTestId("public-sticky-header")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Domov" })).toBeVisible({ timeout: 10000 });
  });

  test("pricing page renders admin-backed service categories", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Cenník služieb/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Pánske služby/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Dámske služby/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Doplnkové služby/i })).toBeVisible({ timeout: 10000 });
  });

  test("my account page renders client zone actions", async ({ page }) => {
    await page.goto("/my-account");
    await expect(page.getByRole("heading", { name: /Môj účet/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^Prihlásenie$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^Registrácia$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^Moje rezervácie$/i })).toBeVisible({ timeout: 10000 });
  });

  test("terms page renders heading", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /Zmluvné podmienky/i })).toBeVisible({ timeout: 15000 });
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
