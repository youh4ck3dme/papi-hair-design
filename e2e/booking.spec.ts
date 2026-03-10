import { test, expect } from "@playwright/test";

test.describe("Booking Flow", () => {
    test.describe.configure({ timeout: 120_000 });

    test("should complete a full booking successfully", async ({ page }) => {
        page.on("console", (msg) => {
            if (msg.type() === "error" || msg.type() === "warning") {
                console.log(`[browser:${msg.type()}] ${msg.text()}`);
            }
        });
        page.on("requestfailed", (request) => {
            console.log(`[requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText}`);
        });

        // 1. Navigate to booking page
        await page.goto("/booking");
        await expect(page.getByTestId("booking-page")).toBeVisible({ timeout: 15000 });

        // Dismiss cookie consent banner (appears after page load)
        const cookieAccept = page.locator('button:has-text("Prijať všetko")');
        await cookieAccept.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
        if (await cookieAccept.isVisible().catch(() => false)) {
            await cookieAccept.click({ force: true });
            await page.waitForTimeout(500);
        }

        // 2. Select category (dataset-safe: try both toggles)
        const categoryStep = page.getByTestId("booking-step-category");
        await expect(categoryStep).toBeVisible({ timeout: 10000 });
        const categoryButtons = categoryStep.locator("div.relative.flex").first().locator("button");
        const firstServiceDirect = categoryStep.locator('button:has-text("min")').first();
        const categoryCount = await categoryButtons.count();
        let categoryReady = false;

        // Default category can already render services without extra click.
        if (await firstServiceDirect.isVisible({ timeout: 1500 }).catch(() => false)) {
            categoryReady = true;
        }

        for (let i = 0; i < Math.min(2, categoryCount); i++) {
            if (categoryReady) break;
            const categoryButton = categoryButtons.nth(i);
            if (!(await categoryButton.isVisible({ timeout: 1000 }).catch(() => false))) {
                continue;
            }

            await categoryButton.click();
            await page.waitForTimeout(800);

            if (await firstServiceDirect.isVisible({ timeout: 1500 }).catch(() => false)) {
                categoryReady = true;
                break;
            }

            const firstSubcategory = page.locator('button[class*="uppercase"][class*="tracking-wider"]').first();
            if (await firstSubcategory.isVisible({ timeout: 1500 }).catch(() => false)) {
                await firstSubcategory.click();
                categoryReady = true;
                break;
            }
        }
        if (!categoryReady) {
            const servicesCount = await firstServiceDirect.count();
            throw new Error(`No category with visible services found (service buttons count: ${servicesCount})`);
        }

        // 4. Select first service
        const firstService = page.locator('button:has-text("min")').first();
        await expect(firstService).toBeVisible({ timeout: 5000 });
        await firstService.click();

        // 5. Select first available worker
        const workerStep = page.getByTestId("booking-step-employee");
        await expect(workerStep).toBeVisible({ timeout: 5000 });
        const workerButtons = workerStep.locator("button");
        const workerCount = await workerButtons.count();
        let workerWithAvailabilityFound = false;
        for (let i = 0; i < workerCount; i++) {
            await workerButtons.nth(i).click();
            await page.waitForTimeout(1200);
            const availableDateCount = await page.locator('[data-testid^="date-btn-"]').count();
            if (availableDateCount > 0) {
                workerWithAvailabilityFound = true;
                break;
            }
        }
        if (!workerWithAvailabilityFound) {
            throw new Error("No employee with available dates found");
        }

        // 6. Select date – pick first enabled date button rendered for this employee
        await page.waitForTimeout(2000);
        const dateButtons = page.locator('[data-testid^="date-btn-"]');
        const dateCount = await dateButtons.count();
        if (dateCount === 0) throw new Error("No available date button found");
        let dateWithSlotsFound = false;
        for (let i = 0; i < Math.min(12, dateCount); i++) {
            const dateButton = dateButtons.nth(i);
            await dateButton.scrollIntoViewIfNeeded();
            await dateButton.click();
            await page.waitForTimeout(1000);
            const slotVisible = await page.getByTestId("time-slot").first().isVisible({ timeout: 1500 }).catch(() => false);
            if (slotVisible) {
                dateWithSlotsFound = true;
                break;
            }
        }
        if (!dateWithSlotsFound) throw new Error("No date with available time slots found");

        // 7. Select time slot – wait for slots to load
        await page.waitForTimeout(1200);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        const timeSlot = page.getByTestId("time-slot").first();
        await expect(timeSlot).toBeVisible({ timeout: 15000 });
        await timeSlot.scrollIntoViewIfNeeded();
        await timeSlot.click();

        // 8. Fill contact info
        const detailsStep = page.getByTestId("booking-step-details");
        await expect(detailsStep).toBeVisible({ timeout: 5000 });

        await page.getByPlaceholder("Meno").fill("Test");
        await page.getByPlaceholder("Priezvisko").fill("User");
        const bookingEmail = `e2e-${Date.now()}@test.sk`;
        await page.getByPlaceholder("Email").fill(bookingEmail);

        const phoneInput = page.locator('input[type="tel"]');
        if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await phoneInput.fill("905123456");
        }

        // Accept terms
        const termsLabel = page.locator('label').filter({ hasText: /podmienk/i }).first();
        await expect(termsLabel).toBeVisible({ timeout: 5000 });
        await termsLabel.click();

        // 9. Submit
        const submitBtn = page.getByTestId("booking-submit");
        await expect(submitBtn).toBeVisible({ timeout: 5000 });
        await submitBtn.click();

        // 10. Verify success
        await expect(page.getByTestId("booking-success")).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(/Rezervácia potvrdená/i)).toBeVisible();

        // 11. Verify register CTA redirects to auth register mode with prefilled email
        await page.getByRole("button", { name: /Dokonči registráciu/i }).click();
        await expect(page).toHaveURL(/\/auth\?mode=register/i, { timeout: 10000 });
        await expect(page.getByTestId("auth-email-input")).toHaveValue(bookingEmail, { timeout: 5000 });
    });
});
