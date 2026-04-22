import { test, expect, type Page } from "@playwright/test";
import { ENABLE_ADMIN_E2E, loginAsAdmin } from "./admin-auth";

async function getCalendarFilterControls(page: Page) {
    const resetButton = page.getByRole("button", { name: /Reset/i }).first();
    const filterBar = page
        .locator("div.rounded-xl.border")
        .filter({ has: resetButton })
        .first();
    const statusTrigger = filterBar.locator('button[role="combobox"]').first();
    const employeeTrigger = filterBar.locator('button[role="combobox"]').nth(1);

    return { filterBar, statusTrigger, employeeTrigger, resetButton };
}

async function assertCalendarShellReady(page: Page, timeout = 30_000) {
    await expect(page.getByRole("button", { name: "Dnes" })).toBeVisible({ timeout });
    await expect(page.getByRole("radio", { name: /^Týždeň$/ }).first()).toBeVisible({ timeout });
}

async function assertCalendarFiltersAndTimeAxis(page: Page, viewportName: "desktop" | "mobile") {
    const { filterBar, statusTrigger, employeeTrigger, resetButton } = await getCalendarFilterControls(page);

    await expect(filterBar).toBeVisible();
    await expect(statusTrigger).toBeVisible();
    await expect(employeeTrigger).toBeVisible();
    await expect(resetButton).toBeVisible();

    const [statusBox, employeeBox, resetBox] = await Promise.all([
        statusTrigger.boundingBox(),
        employeeTrigger.boundingBox(),
        resetButton.boundingBox(),
    ]);
    expect(statusBox).not.toBeNull();
    expect(employeeBox).not.toBeNull();
    expect(resetBox).not.toBeNull();

    const topDeltaStatusEmployee = Math.abs((statusBox?.y ?? 0) - (employeeBox?.y ?? 0));
    const topDeltaStatusReset = Math.abs((statusBox?.y ?? 0) - (resetBox?.y ?? 0));
    const bottomDeltaStatusEmployee = Math.abs(
        ((statusBox?.y ?? 0) + (statusBox?.height ?? 0)) - ((employeeBox?.y ?? 0) + (employeeBox?.height ?? 0))
    );
    const bottomDeltaStatusReset = Math.abs(
        ((statusBox?.y ?? 0) + (statusBox?.height ?? 0)) - ((resetBox?.y ?? 0) + (resetBox?.height ?? 0))
    );
    expect(Math.max(topDeltaStatusEmployee, topDeltaStatusReset)).toBeLessThan(8);
    expect(Math.max(bottomDeltaStatusEmployee, bottomDeltaStatusReset)).toBeLessThan(8);

    await statusTrigger.click();
    const pendingOption = page.getByRole("option", { name: "Čakajúce" });
    await expect(pendingOption).toBeVisible();
    await pendingOption.click();
    await expect(statusTrigger).toContainText("Čakajúce");

    await employeeTrigger.click();
    await expect(page.getByRole("option", { name: "Všetci zamestnanci" })).toBeVisible();
    const employeeOptions = page.getByRole("option");
    const employeeOptionCount = await employeeOptions.count();
    if (employeeOptionCount > 1) {
        const selectedEmployee = employeeOptions.nth(1);
        const selectedEmployeeLabel = (await selectedEmployee.textContent())?.trim() ?? "";
        await selectedEmployee.click();
        if (selectedEmployeeLabel) {
            await expect(employeeTrigger).toContainText(selectedEmployeeLabel);
        }
    } else {
        await page.getByRole("option", { name: "Všetci zamestnanci" }).click();
    }

    await resetButton.click();
    await expect(statusTrigger).toContainText("Všetky stavy");
    await expect(employeeTrigger).toContainText("Všetci zamestnanci");

    const weekToggle = page.getByRole("radio", { name: /^Týždeň$/ }).first();
    await expect(weekToggle).toBeVisible();
    await weekToggle.click();
    await expect(weekToggle).toBeChecked();

    const timeGutter =
        viewportName === "desktop"
            ? page.locator(".booking-calendar-body .sticky.left-0.w-12.hidden.md\\:block").first()
            : page.locator(".booking-calendar-body .sticky.left-0.w-12.block.md\\:hidden").first();
    await expect(timeGutter).toBeVisible();
    await expect(timeGutter).toContainText("3:00");
    await expect(timeGutter.getByText("2:00", { exact: true })).toHaveCount(0);

    await expect(filterBar).toHaveScreenshot(`admin-calendar-filters-${viewportName}.png`, {
        animations: "disabled",
    });
    await expect(timeGutter).toHaveScreenshot(`admin-calendar-time-gutter-${viewportName}.png`, {
        animations: "disabled",
    });
}

test.describe("Admin Calendar", () => {
    test.describe.configure({ timeout: 90_000 });

    test.skip(
        !ENABLE_ADMIN_E2E,
        "Set PLAYWRIGHT_ENABLE_ADMIN_E2E=1 with isolated admin credentials before running admin calendar mutations."
    );

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);

        // Ensure we are on the calendar page (might be the default admin subpage)
        if (!page.url().includes("/admin/calendar")) {
            await page.goto("/admin/calendar");
        }
        await assertCalendarShellReady(page);
    });

    test("should render the calendar and switch views", async ({ page }) => {
        const weekToggle = page.getByRole("radio", { name: /^Týždeň$/ }).first();
        const dayToggle = page.getByRole("radio", { name: /^Deň$/ }).first();
        const monthToggle = page.getByRole("radio", { name: /^Mesiac$/ }).first();

        await assertCalendarShellReady(page);
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
        // Move to day mode and click a deterministic slot.
        await page.getByRole("radio", { name: /^Deň$/ }).first().click();

        const slot = page.getByRole("button", { name: /okolo/i }).first();
        await expect(slot).toBeVisible({ timeout: 10000 });
        const slotLabel = (await slot.getAttribute("aria-label")) ?? "";
        const slotTimeMatch = slotLabel.match(/(\d{1,2}:\d{2})/);
        const expectedTime = slotTimeMatch ? slotTimeMatch[1].padStart(5, "0") : null;
        await slot.click({ position: { x: 8, y: 4 } });

        // Modal opens with the clicked time context.
        await expect(page.locator('div[role="dialog"]').getByRole("heading", { name: "Nová rezervácia" })).toBeVisible({ timeout: 5000 });
        if (expectedTime) {
            await expect(page.locator('div[role="dialog"] p.text-sm.font-medium.text-primary').first()).toContainText(expectedTime);
        }

        // Close modal
        await page.locator('button:has-text("Zrušiť")').click();
        await expect(page.locator('div[role="dialog"]').getByRole("heading", { name: "Nová rezervácia" })).not.toBeVisible();
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

    test("desktop + mobile visual smoke: filters, dropdowns and 03:00 calendar start", async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.goto("/admin/calendar");
        await assertCalendarShellReady(page, 15_000);
        await assertCalendarFiltersAndTimeAxis(page, "desktop");

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/admin/calendar");
        await assertCalendarShellReady(page, 15_000);
        await assertCalendarFiltersAndTimeAxis(page, "mobile");
    });
});
