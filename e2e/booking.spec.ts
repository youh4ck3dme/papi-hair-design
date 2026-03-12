import { test, expect, Page } from "@playwright/test";

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? "AIzaSyB9XP28a-BT-rP-tCyYZJSz64gxjr82iEo";

async function dismissCookieConsent(page: Page) {
    const cookieAccept = page.locator('button:has-text("Prijať všetko")');
    await cookieAccept.waitFor({ state: "visible", timeout: 5000 }).catch(() => { });
    if (await cookieAccept.isVisible().catch(() => false)) {
        await cookieAccept.click({ force: true }).catch(async () => {
            await cookieAccept.evaluate((el) => (el as HTMLButtonElement).click());
        });
        await page.waitForTimeout(500);
    }
}

async function createAuthTestUser(email: string, password: string) {
    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
    );

    if (response.ok) return;
    const payload = await response.json().catch(() => ({}));
    const message = String(payload?.error?.message ?? "");
    if (message.includes("EMAIL_EXISTS")) return;
    throw new Error(`Unable to create auth test user: ${message || response.statusText}`);
}

async function reachBookingDetailsStep(page: Page) {
    await page.goto("/booking");
    await expect(page.getByTestId("booking-page")).toBeVisible({ timeout: 15000 });
    await dismissCookieConsent(page);

    const categoryStep = page.getByTestId("booking-step-category");
    await expect(categoryStep).toBeVisible({ timeout: 10000 });
    const categoryButtons = categoryStep.locator("div.relative.flex").first().locator("button");
    const firstServiceDirect = categoryStep.locator('button:has-text("min")').first();
    const categoryCount = await categoryButtons.count();
    let categoryReady = false;

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
        throw new Error("No category with visible services found");
    }

    await expect(firstServiceDirect).toBeVisible({ timeout: 5000 });
    await firstServiceDirect.click();
    await expect(page.locator('[data-testid^="date-btn-"]').first()).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1200);
    const dateButtons = page.locator('[data-testid^="date-btn-"]');
    const dateCount = await dateButtons.count();
    if (dateCount === 0) {
        throw new Error("No available date button found");
    }

    let dateWithSlotsFound = false;
    for (let i = 0; i < Math.min(10, dateCount); i++) {
        const dateButton = dateButtons.nth(i);
        await dateButton.scrollIntoViewIfNeeded();
        await dateButton.click();
        await page.waitForTimeout(900);
        const slotVisible = await page.getByTestId("time-slot").first().isVisible({ timeout: 1500 }).catch(() => false);
        if (slotVisible) {
            dateWithSlotsFound = true;
            break;
        }
    }
    if (!dateWithSlotsFound) {
        throw new Error("No date with available time slots found");
    }

    await page.getByTestId("time-slot").first().click();
    await expect(page.getByTestId("booking-step-details")).toBeVisible({ timeout: 5000 });
}

async function completeBooking(page: Page, bookingEmail: string): Promise<{ registerCtaVisible: boolean }> {
    await reachBookingDetailsStep(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const detailsStep = page.getByTestId("booking-step-details");

    await page.getByPlaceholder("Meno").fill("Test");
    await page.getByPlaceholder("Priezvisko").fill("User");
    await page.getByPlaceholder("Email").fill(bookingEmail);

    const phoneInput = page.locator('input[type="tel"]');
    if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await phoneInput.fill("905123456");
    }

    const consentCheckboxes = detailsStep.locator('input[type="checkbox"]');
    await expect(consentCheckboxes).toHaveCount(4, { timeout: 5000 });
    await consentCheckboxes.nth(2).setChecked(true, { force: true });
    await consentCheckboxes.nth(3).setChecked(true, { force: true });

    await dismissCookieConsent(page);

    const submitBtn = page.getByTestId("booking-submit");
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click({ force: true });

    await expect(page.getByTestId("booking-success")).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/Rezervácia potvrdená/i)).toBeVisible();

    const registerCta = page.getByRole("button", { name: /Dokonči registráciu/i });
    return { registerCtaVisible: await registerCta.isVisible().catch(() => false) };
}

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

        const bookingEmail = `e2e-${Date.now()}@test.sk`;
        const { registerCtaVisible } = await completeBooking(page, bookingEmail);

        if (registerCtaVisible) {
            const registerCta = page.getByRole("button", { name: /Dokonči registráciu/i });
            await registerCta.click();
            await expect(page).toHaveURL(/\/auth\?mode=register/i, { timeout: 10000 });
            await expect(page.getByTestId("auth-email-input")).toHaveValue(bookingEmail, { timeout: 5000 });
        } else {
            await expect(page.getByRole("button", { name: /Nová rezervácia/i })).toBeVisible({ timeout: 5000 });
        }
    });

    test("should complete booking for authenticated user without registration CTA", async ({ page }) => {
        const stamp = Date.now();
        const authEmail = `e2e-auth-${stamp}@test.sk`;
        const authPassword = `Qq!${stamp}abcd!`;

        await createAuthTestUser(authEmail, authPassword);

        await page.goto("/auth");
        await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15000 });
        await dismissCookieConsent(page);

        await page.getByTestId("auth-email-input").fill(authEmail);
        await page.locator('input[type="password"]').fill(authPassword);
        await page.getByTestId("auth-login-btn").click();

        await expect(page).toHaveURL(/\/(admin|bootstrap|booking|auth)/, { timeout: 15000 });

        const { registerCtaVisible } = await completeBooking(page, authEmail);
        expect(registerCtaVisible).toBe(false);
        await expect(page.getByRole("button", { name: /Nová rezervácia/i })).toBeVisible({ timeout: 5000 });
    });

    test("should show consent links and navigate to privacy and terms pages", async ({ page }) => {
        await reachBookingDetailsStep(page);

        const detailsStep = page.getByTestId("booking-step-details");
        const privacyLink = detailsStep.locator('a[href="/privacy"]').first();
        const termsLink = detailsStep.locator('a[href="/terms"]').first();

        await expect(privacyLink).toBeVisible({ timeout: 5000 });
        await expect(termsLink).toBeVisible({ timeout: 5000 });

        await privacyLink.click();
        await expect(page).toHaveURL(/\/privacy/i, { timeout: 10000 });
        await expect(page.getByRole("heading", { name: /Zásady ochrany osobných údajov/i })).toBeVisible({ timeout: 10000 });

        await page.goto("/booking");
        await reachBookingDetailsStep(page);
        await page.getByTestId("booking-step-details").locator('a[href="/terms"]').first().click();
        await expect(page).toHaveURL(/\/terms/i, { timeout: 10000 });
        await expect(page.getByRole("heading", { name: /Zmluvné podmienky|Terms/i })).toBeVisible({ timeout: 10000 });
    });
});
