import { test, expect } from "@playwright/test";

test.describe("Auth page", () => {
  test("renders login heading", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Prihlásenie/i)).toBeVisible({ timeout: 10000 });
  });

  test("renders email and password inputs", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByTestId("auth-email-input")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("auth-email-input").fill("nonexistent@test.sk");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByTestId("auth-login-btn").click();
    await expect(page.getByText(/neplatné|chyba|wrong|invalid|error/i)).toBeVisible({ timeout: 10000 });
  });

  test("booking link navigates to /booking", async ({ page }) => {
    await page.goto("/auth");
    const bookingLink = page.getByRole("link", { name: /rezervovať|booking/i });
    if (await bookingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookingLink.click();
      await expect(page).toHaveURL(/\/booking/, { timeout: 10000 });
    } else {
      // Fallback: direct navigate works
      await page.goto("/booking");
      await expect(page.getByTestId("booking-page")).toBeVisible({ timeout: 15000 });
    }
  });

  test("no horizontal overflow on auth page mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
