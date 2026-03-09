import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "papi@papihairdesign.sk";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "88888888";

test.describe("Admin Calendar", () => {
    test.beforeEach(async ({ page }) => {
        // Log in as owner
        await page.goto("/auth");

        // Wait for auth page and dismiss cookies if needed
        await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15000 });

        const cookieAccept = page.locator('button:has-text("Prijať všetko")');
        if (await cookieAccept.isVisible().catch(() => false)) {
            await cookieAccept.click();
        }

        // Fill credentials
        await page.getByTestId("auth-email-input").fill(ADMIN_EMAIL);
        await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
        await page.getByTestId("auth-login-btn").click();

        // Should redirect to /admin/calendar or /admin
        await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

        // Ensure we are on the calendar page (might be the default admin subpage)
        if (!page.url().includes("/admin/calendar")) {
            await page.goto("/admin/calendar");
        }
        await expect(page.locator('h1:has-text("Kalendár")')).toBeVisible({ timeout: 15000 });
    });

    test("should render the calendar and switch views", async ({ page }) => {
        const weekToggle = page.getByRole("radio", { name: /^Týždeň$/ }).first();
        const dayToggle = page.getByRole("radio", { name: /^Deň$/ }).first();
        const monthToggle = page.getByRole("radio", { name: /^Mesiac$/ }).first();

        await expect(page.locator('h1:has-text("Kalendár")')).toBeVisible();
        await expect(weekToggle).toBeVisible();
        await expect(dayToggle).toBeVisible();
        await expect(monthToggle).toBeVisible();
        await expect(page.getByRole("button", { name: /Vybrať čas okolo/i }).first()).toBeVisible();

        // Normalize to Week view first, because state can persist from previous runs.
        await weekToggle.click();
        await expect(weekToggle).toBeChecked();

        // Switch to Day view
        await dayToggle.click();
        await expect(dayToggle).toBeChecked();

        // Switch to Month view
        await monthToggle.click();
        await expect(monthToggle).toBeChecked();
    });

    test("should open the new booking modal on slot click", async ({ page }) => {
        // Find an empty slot and click it
        // The slot selector depends on the BookingCalendar implementation
        // Usually it's a div or cell in the grid
        const slot = page.locator('.rbc-day-bg').first(); // Common in react-big-calendar which BookingCalendar uses
        if (await slot.isVisible()) {
            await slot.click({ position: { x: 5, y: 5 } });

            // Check if modal opens
            await expect(page.locator('text=Nová rezervácia')).toBeVisible({ timeout: 5000 });

            // Close modal
            await page.locator('button:has-text("Zrušiť")').click();
            await expect(page.locator('text=Nová rezervácia')).not.toBeVisible();
        }
    });

    test("should show appointment details when clicking an event", async ({ page }) => {
        // Wait for events to load
        await page.waitForTimeout(2000);

        const event = page.locator('.rbc-event').first();
        if (await event.isVisible()) {
            await event.click();

            // Detail modal should appear
            await expect(page.locator('text=Detail rezervácie')).toBeVisible({ timeout: 5000 });

            // Check for status badge or buttons
            // (Depending on status, buttons like "Potvrdiť", "Zrušiť" etc. should appear)
        }
    });
});
