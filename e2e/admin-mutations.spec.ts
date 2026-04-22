import { expect, test, type Locator, type Page } from "@playwright/test";
import { ENABLE_ADMIN_MUTATION_E2E, loginAsAdmin } from "./admin-auth";

async function isSwitchChecked(switchLocator: Locator) {
  return (await switchLocator.getAttribute("aria-checked")) === "true";
}

async function isCheckboxChecked(checkbox: Locator) {
  return (await checkbox.getAttribute("data-state")) === "checked";
}

function employeeCardByName(page: Page, displayName: string) {
  return page.locator("div.admin-premium-card").filter({ has: page.getByText(displayName, { exact: true }) }).first();
}

async function openEmployeeEditorByName(page: Page, displayName: string) {
  const card = employeeCardByName(page, displayName);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: /Upraviť profil/i }).click();
  await expect(page.getByRole("heading", { name: /Upraviť profil člena/i })).toBeVisible({ timeout: 10_000 });
}

async function closeEmployeeEditor(page: Page) {
  const cancelButton = page.getByRole("button", { name: /Zrušiť/i });
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click();
  }
  await expect(page.getByRole("heading", { name: /Upraviť profil člena/i })).not.toBeVisible({ timeout: 10_000 });
}

async function createTemporaryRestrictedEmployee(page: Page, displayName: string) {
  await page.goto("/admin/employees");
  await expect(page.getByRole("heading", { name: "Tím" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Pridať člena tímu/i }).click();
  await expect(page.getByRole("heading", { name: /Pridať nového člena tímu/i })).toBeVisible({ timeout: 10_000 });

  await page.getByPlaceholder("napr. Jana Nováková").fill(displayName);

  const serviceModeSwitch = page.getByRole("switch").first();
  if (!(await isSwitchChecked(serviceModeSwitch))) {
    await serviceModeSwitch.click();
  }

  const servicesContainer = page.getByTestId("employee-services-scroll-container");
  await expect(servicesContainer).toBeVisible({ timeout: 10_000 });
  const serviceCheckboxes = servicesContainer.getByRole("checkbox");
  await expect(serviceCheckboxes.first()).toBeVisible({ timeout: 10_000 });

  const serviceCount = await serviceCheckboxes.count();
  if (serviceCount === 0) {
    throw new Error("No services available for employee mutation E2E.");
  }

  await serviceCheckboxes.nth(0).click();
  if (serviceCount > 1) {
    await serviceCheckboxes.nth(1).click();
  }

  await page.getByRole("button", { name: /Vytvoriť profil/i }).click();
  await expect(page.getByText(/Zamestnanec pridaný/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Pridať nového člena tímu/i })).not.toBeVisible({ timeout: 15_000 });
  await expect(employeeCardByName(page, displayName)).toBeVisible({ timeout: 15_000 });
}

async function ensureRestrictedEmployeeFixture(page: Page, displayName: string) {
  await page.goto("/admin/employees");
  await expect(page.getByRole("heading", { name: "Tím" })).toBeVisible({ timeout: 20_000 });
  const existingCard = employeeCardByName(page, displayName);
  if (await existingCard.count()) {
    await expect(existingCard).toBeVisible({ timeout: 15_000 });
    return;
  }

  await createTemporaryRestrictedEmployee(page, displayName);
}

async function saveEmployeeChanges(page: Page) {
  await page.getByRole("button", { name: /Uložiť zmeny/i }).click();
  await expect(page.getByText(/Zamestnanec aktualizovaný/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Upraviť profil člena/i })).not.toBeVisible({ timeout: 15_000 });
}

async function openBookingSettingsTab(page: Page) {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Nastavenia", exact: true })).toBeVisible({ timeout: 20_000 });
  const bookingTab = page.getByRole("tab", { name: "Booking" });
  await bookingTab.click();
  await expect(bookingTab).toHaveAttribute("data-state", "active");
  await expect(page.getByText("Nastavenia rezervácií")).toBeVisible({ timeout: 10_000 });
}

async function saveBookingSettings(page: Page) {
  await page.getByRole("button", { name: /Uložiť nastavenia/i }).click();
  await expect(page.getByText(/Nastavenia booking uložené/i)).toBeVisible({ timeout: 15_000 });
}

test.describe("Admin authenticated mutations", () => {
  test.describe.configure({ timeout: 150_000 });

  test.skip(
    !ENABLE_ADMIN_MUTATION_E2E,
    "Set PLAYWRIGHT_ENABLE_ADMIN_MUTATION_E2E=1 with isolated admin credentials before running admin mutations.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("employees restricted services flow saves and restores service assignments", async ({ page }) => {
    const employeeName = "E2E Restricted Fixture";

    await ensureRestrictedEmployeeFixture(page, employeeName);
    await openEmployeeEditorByName(page, employeeName);

    const servicesContainer = page.getByTestId("employee-services-scroll-container");
    await expect(servicesContainer).toBeVisible({ timeout: 10_000 });

    const serviceCheckboxes = servicesContainer.getByRole("checkbox");
    const serviceCount = await serviceCheckboxes.count();
    expect(serviceCount).toBeGreaterThan(1);

    const currentStates = await Promise.all(
      Array.from({ length: serviceCount }, async (_, index) => isCheckboxChecked(serviceCheckboxes.nth(index))),
    );
    const checkedIndexes = currentStates.flatMap((checked, index) => (checked ? [index] : []));
    expect(checkedIndexes.length).toBeGreaterThan(1);

    const targetIndex = checkedIndexes[0];
    const targetCheckbox = serviceCheckboxes.nth(targetIndex);
    await targetCheckbox.click();
    await expect(targetCheckbox).toHaveAttribute("data-state", "unchecked");

    await saveEmployeeChanges(page);

    await openEmployeeEditorByName(page, employeeName);
    const verifyContainer = page.getByTestId("employee-services-scroll-container");
    await expect(verifyContainer).toBeVisible({ timeout: 10_000 });
    const verifyCheckbox = verifyContainer.getByRole("checkbox").nth(targetIndex);
    await expect(verifyCheckbox).toHaveAttribute("data-state", "unchecked");

    await verifyCheckbox.click();
    await expect(verifyCheckbox).toHaveAttribute("data-state", "checked");
    await saveEmployeeChanges(page);

    await openEmployeeEditorByName(page, employeeName);
    await expect(page.getByTestId("employee-services-scroll-container").getByRole("checkbox").nth(targetIndex)).toHaveAttribute(
      "data-state",
      "checked",
    );
    await closeEmployeeEditor(page);
  });

  test("booking settings toggle saves and restores persisted provider setting", async ({ page }) => {
    let initialState = false;
    let mutationPersisted = false;

    try {
      await openBookingSettingsTab(page);

      const bookingSwitch = page.getByRole("switch").first();
      initialState = await isSwitchChecked(bookingSwitch);

      await bookingSwitch.click();
      await expect(bookingSwitch).toHaveAttribute("aria-checked", initialState ? "false" : "true");

      await saveBookingSettings(page);
      mutationPersisted = true;

      await openBookingSettingsTab(page);
      await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", initialState ? "false" : "true");
    } finally {
      if (mutationPersisted) {
        await openBookingSettingsTab(page);
        const restoreSwitch = page.getByRole("switch").first();
        const currentState = await isSwitchChecked(restoreSwitch);

        if (currentState !== initialState) {
          await restoreSwitch.click();
        }

        await expect(restoreSwitch).toHaveAttribute("aria-checked", initialState ? "true" : "false");
        await saveBookingSettings(page);

        await openBookingSettingsTab(page);
        await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", initialState ? "true" : "false");
      }
    }
  });
});
