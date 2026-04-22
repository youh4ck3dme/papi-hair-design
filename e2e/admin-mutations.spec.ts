import { expect, test, type Locator, type Page } from "@playwright/test";
import { ENABLE_ADMIN_MUTATION_E2E, loginAsAdmin } from "./admin-auth";

async function isSwitchChecked(switchLocator: Locator) {
  return (await switchLocator.getAttribute("aria-checked")) === "true";
}

async function isCheckboxChecked(checkbox: Locator) {
  return (await checkbox.getAttribute("data-state")) === "checked";
}

async function openEmployeeEditorByIndex(page: Page, index: number) {
  const editButton = page.getByRole("button", { name: /Upraviť profil/i }).nth(index);
  await expect(editButton).toBeVisible({ timeout: 10_000 });
  await editButton.click();
  await expect(page.getByRole("heading", { name: /Upraviť profil člena/i })).toBeVisible({ timeout: 10_000 });
}

async function closeEmployeeEditor(page: Page) {
  const cancelButton = page.getByRole("button", { name: /Zrušiť/i });
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click();
  }
  await expect(page.getByRole("heading", { name: /Upraviť profil člena/i })).not.toBeVisible({ timeout: 10_000 });
}

async function openRestrictedEmployeeEditor(page: Page) {
  await page.goto("/admin/employees");
  await expect(page.getByRole("heading", { name: "Tím" })).toBeVisible({ timeout: 20_000 });

  const editButtons = page.getByRole("button", { name: /Upraviť profil/i });
  const totalEmployees = await editButtons.count();
  if (totalEmployees === 0) {
    throw new Error("No employees available for admin mutation E2E.");
  }

  for (let index = 0; index < totalEmployees; index += 1) {
    await openEmployeeEditorByIndex(page, index);
    const serviceModeSwitch = page.getByRole("switch").first();
    if (await isSwitchChecked(serviceModeSwitch)) {
      return index;
    }
    await closeEmployeeEditor(page);
  }

  throw new Error("No restricted employee found for reversible admin mutation E2E.");
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
    let employeeIndex = -1;
    let targetIndex = -1;
    let originalChecked = false;
    let mutationPersisted = false;

    try {
      employeeIndex = await openRestrictedEmployeeEditor(page);

      const servicesContainer = page.getByTestId("employee-services-scroll-container");
      await expect(servicesContainer).toBeVisible({ timeout: 10_000 });

      const serviceCheckboxes = servicesContainer.getByRole("checkbox");
      const serviceCount = await serviceCheckboxes.count();
      expect(serviceCount).toBeGreaterThan(0);

      const currentStates = await Promise.all(
        Array.from({ length: serviceCount }, async (_, index) => isCheckboxChecked(serviceCheckboxes.nth(index))),
      );
      const checkedIndexes = currentStates
        .map((checked, index) => ({ checked, index }))
        .filter((entry) => entry.checked)
        .map((entry) => entry.index);
      const uncheckedIndexes = currentStates
        .map((checked, index) => ({ checked, index }))
        .filter((entry) => !entry.checked)
        .map((entry) => entry.index);

      if (uncheckedIndexes.length > 0) {
        targetIndex = uncheckedIndexes[0];
        originalChecked = false;
      } else {
        if (checkedIndexes.length < 2) {
          test.skip(true, "Need at least two assigned services to verify a reversible restricted-services mutation.");
        }
        targetIndex = checkedIndexes[0];
        originalChecked = true;
      }

      const targetCheckbox = serviceCheckboxes.nth(targetIndex);
      await targetCheckbox.click();
      await expect(targetCheckbox).toHaveAttribute("data-state", originalChecked ? "unchecked" : "checked");

      await saveEmployeeChanges(page);
      mutationPersisted = true;

      await openEmployeeEditorByIndex(page, employeeIndex);
      const verifyContainer = page.getByTestId("employee-services-scroll-container");
      await expect(verifyContainer).toBeVisible({ timeout: 10_000 });
      const verifyCheckbox = verifyContainer.getByRole("checkbox").nth(targetIndex);
      await expect(verifyCheckbox).toHaveAttribute("data-state", originalChecked ? "unchecked" : "checked");

      await closeEmployeeEditor(page);
    } finally {
      if (!mutationPersisted || employeeIndex < 0 || targetIndex < 0) {
        return;
      }

      await page.goto("/admin/employees");
      await expect(page.getByRole("heading", { name: "Tím" })).toBeVisible({ timeout: 20_000 });
      await openEmployeeEditorByIndex(page, employeeIndex);

      const restoreContainer = page.getByTestId("employee-services-scroll-container");
      await expect(restoreContainer).toBeVisible({ timeout: 10_000 });
      const restoreCheckbox = restoreContainer.getByRole("checkbox").nth(targetIndex);
      const currentChecked = await isCheckboxChecked(restoreCheckbox);

      if (currentChecked !== originalChecked) {
        await restoreCheckbox.click();
      }

      await expect(restoreCheckbox).toHaveAttribute("data-state", originalChecked ? "checked" : "unchecked");
      await saveEmployeeChanges(page);

      await openEmployeeEditorByIndex(page, employeeIndex);
      const restoredCheckbox = page
        .getByTestId("employee-services-scroll-container")
        .getByRole("checkbox")
        .nth(targetIndex);
      await expect(restoredCheckbox).toHaveAttribute("data-state", originalChecked ? "checked" : "unchecked");
      await closeEmployeeEditor(page);
    }
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
      if (!mutationPersisted) {
        return;
      }

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
  });
});
