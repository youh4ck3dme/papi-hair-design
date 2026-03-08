import { test, expect } from "@playwright/test";

test.describe("Calendar Comprehensive Tests", () => {

    test("Public Booking Flow Integrity", async ({ page }) => {
        await page.goto("/booking");
        await expect(page.getByTestId("booking-page")).toBeVisible({ timeout: 15000 });

        // Check for core steps
        await expect(page.getByTestId("booking-step-category")).toBeVisible();

        // Pick first category if available
        const firstCat = page.locator('button[class*="uppercase"][class*="tracking-wider"]').first();
        if (await firstCat.isVisible()) {
            await firstCat.click();
        }
    });

    test("Admin Calendar Navigation & Views", async ({ page }) => {
        await page.goto("/auth");
        await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15000 });

        // Credentials
        await page.getByTestId("auth-email-input").fill("owner@papihairdesign.sk");
        await page.locator('input[type="password"]').fill("PapiDemo2025!");
        await page.getByTestId("auth-login-btn").click();

        await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
        await page.goto("/admin/calendar");

        await expect(page.locator('h1:has-text("Kalendár")')).toBeVisible();

        // Switch views
        const dayBtn = page.locator('button:has-text("Deň")');
        if (await dayBtn.isVisible()) await dayBtn.click();

        const monthBtn = page.locator('button:has-text("Mesiac")');
        if (await monthBtn.isVisible()) await monthBtn.click();
    });

});
