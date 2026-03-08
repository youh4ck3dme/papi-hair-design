import { test, expect } from "@playwright/test";

test.describe("Calendar Comprehensive Tests", () => {
    test.beforeEach(async ({ page }) => {
        // 1. Navigate to auth page
        await page.goto("/auth");
        await page.waitForLoadState("networkidle");

        // 2. Check if already logged in (redirected to /admin)
        if (page.url().includes("/auth")) {
            await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15000 });

            // Skip cookie banner
            const cookieAccept = page.locator('button:has-text("Prijať všetko")');
            if (await cookieAccept.isVisible()) {
                await cookieAccept.click();
            }

            // Login with verified test admin
            await page.getByTestId("auth-email-input").fill("antigravity@test.sk");
            await page.locator('input[type="password"]').fill("PapiTest2026!");
            await page.getByTestId("auth-login-btn").click();

            // Wait for redirection
            await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
        }

        // 3. Navigate to calendar
        if (!page.url().includes("/admin/calendar")) {
            await page.goto("/admin/calendar");
        }

        // 4. Verify calendar is loaded
        await expect(page.locator('h1:has-text("Kalendár")')).toBeVisible({ timeout: 15000 });
        // Instead of rbc-calendar, check for the custom slot class
        await expect(page.locator('.booking-calendar-slot').first()).toBeVisible({ timeout: 15000 });
    });

    test("Navigation and View Switching", async ({ page }) => {
        // 1. Initial State (Week view by default)
        await expect(page.locator('button[value="week"][data-state="on"]')).toBeVisible({ timeout: 10000 });

        // 2. Navigation
        const dateElement = page.locator('span.min-w-\\[180px\\]');
        const initialDate = await dateElement.textContent();

        // Go back (Week jump)
        await page.locator('button:has(.lucide-chevron-left)').click();
        await page.waitForTimeout(1000);
        const backDate = await dateElement.textContent();
        expect(initialDate).not.toBe(backDate);

        // Go forward
        await page.locator('button:has(.lucide-chevron-right)').click();
        await page.waitForTimeout(1000);
        const forwardDate = await dateElement.textContent();
        expect(forwardDate).toBe(initialDate);

        // 3. View Switching
        // Switch to Day
        const dayBtn = page.locator('button[value="day"]');
        await dayBtn.click();
        await expect(page.locator('button[value="day"][data-state="on"]')).toBeVisible();

        // Switch to Month
        const monthBtn = page.locator('button[value="month"]');
        await monthBtn.click();
        await expect(page.locator('button[value="month"][data-state="on"]')).toBeVisible();
    });

    test("Booking Creation Flow", async ({ page }) => {
        await page.locator('button[value="week"]').click();
        await page.waitForTimeout(2000);

        // 1. Open Booking modal
        // Pick a slot that is likely to be open (around middle of the grid)
        const slot = page.locator('.booking-calendar-slot').nth(15);
        await slot.click({ force: true });

        await expect(page.locator('text=Nová rezervácia')).toBeVisible({ timeout: 10000 });

        // 2. Fill the booking form
        await page.locator('button:has-text("Vyberte službu")').click();
        await page.locator('role=option').first().click();

        await page.locator('button:has-text("Vyberte zamestnanca")').click();
        await page.locator('role=option').first().click();

        // Wait for time slots to load
        const timeSlot = page.locator('button.text-xs.py-1\\.5').first();
        await expect(timeSlot).toBeVisible({ timeout: 15000 });
        await timeSlot.click();

        // Submit
        await page.locator('button:has-text("Vytvoriť rezerváciu")').click();
        await expect(page.locator('text=Rezervácia vytvorená')).toBeVisible({ timeout: 15000 });
    });

    test("Event Management (Detail and Status)", async ({ page }) => {
        await page.waitForTimeout(3000);

        let event = page.locator('.booking-calendar-event').first();

        // Ensure at least one event exists
        if (!(await event.isVisible())) {
            const slot = page.locator('.booking-calendar-slot').nth(10);
            await slot.click({ force: true });
            await page.locator('button:has-text("Vyberte službu")').click();
            await page.locator('role=option').first().click();
            await page.locator('button:has-text("Vyberte zamestnanca")').click();
            await page.locator('role=option').first().click();
            await page.locator('button.text-xs.py-1\\.5').first().click();
            await page.locator('button:has-text("Vytvoriť rezerváciu")').click();
            await expect(page.locator('text=Rezervácia vytvorená')).toBeVisible();
            await page.waitForTimeout(2000);
            event = page.locator('.booking-calendar-event').first();
        }

        // Click event to see details
        await event.click();
        await expect(page.locator('text=Detail rezervácie')).toBeVisible({ timeout: 10000 });

        // Attempt status update
        const confirmBtn = page.locator('button:has-text("Potvrdiť")');
        const doneBtn = page.locator('button:has-text("Dokončiť")');

        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await expect(page.locator('text=Status aktualizovaný')).toBeVisible();
        } else if (await doneBtn.isVisible()) {
            await doneBtn.click();
            await expect(page.locator('text=Status aktualizovaný')).toBeVisible();
        }
    });

    test("Mobile View Integrity", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(2000);

        // Basic sanity check for mobile
        await expect(page.locator('h1:has-text("Kalendár")')).toBeVisible();
        const navHeader = page.locator('span.min-w-\\[180px\\]');
        await expect(navHeader).toBeVisible();

        // Check if day view works on mobile
        await page.locator('button[value="day"]').click();
        await expect(page.locator('button[value="day"][data-state="on"]')).toBeVisible();
    });

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
