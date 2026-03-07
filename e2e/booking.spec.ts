import { test, expect } from "@playwright/test";

test.describe("Booking Flow", () => {
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

        // 2. Select category with available subcategories (dataset-safe)
        const categoryStep = page.getByTestId("booking-step-category");
        let categoryReady = false;
        for (const categoryLabel of ["Pánske Služby", "Dámske Služby"]) {
            const categoryButton = categoryStep.getByText(categoryLabel);
            if (!(await categoryButton.isVisible({ timeout: 1000 }).catch(() => false))) continue;

            await categoryButton.click();
            await page.waitForTimeout(800);

            const firstServiceDirect = page.locator('button:has-text("min")').first();
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
        if (!categoryReady) throw new Error("No category with visible services found");

        // 4. Select first service
        const firstService = page.locator('button:has-text("min")').first();
        await expect(firstService).toBeVisible({ timeout: 5000 });
        await firstService.click();

        // 5. Select first available worker
        const workerStep = page.getByTestId("booking-step-employee");
        await expect(workerStep).toBeVisible({ timeout: 5000 });
        const firstWorker = workerStep.locator('button').first();
        await firstWorker.click();

        // 6. Select date – wait for data to load then pick first available weekday
        await page.waitForTimeout(2000);

        // Try days 10, 13, 16, 20 (all weekdays in March 2026)
        let dayClicked = false;
        for (const day of [10, 13, 16, 20, 11, 12, 17, 18, 19]) {
            const btn = page.getByTestId(`date-btn-${day}`);
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await btn.scrollIntoViewIfNeeded();
                await btn.click();
                dayClicked = true;
                break;
            }
        }
        if (!dayClicked) throw new Error("No available date button found");

        // 7. Select time slot – wait for slots to load
        await page.waitForTimeout(2500);
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
        await page.getByPlaceholder("Email").fill(`e2e-${Date.now()}@test.sk`);

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
    });
});
