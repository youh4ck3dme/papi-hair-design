import { test, expect } from "@playwright/test";
import { ENABLE_ADMIN_SMOKE_E2E, loginAsAdmin } from "./admin-auth";

test.describe("Admin read-only smoke", () => {
  test.describe.configure({ timeout: 90_000 });

  test.skip(
    !ENABLE_ADMIN_SMOKE_E2E,
    "Set PLAYWRIGHT_ENABLE_ADMIN_SMOKE_E2E=1 with isolated admin credentials before running admin smoke checks.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("appointments page renders filters and cards without console regressions", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/admin/appointments");
    await expect(page.getByRole("heading", { name: "Rezervácie" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByPlaceholder("Meno alebo služba...")).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(page.locator("button.group, button[class*='admin-premium-card']").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(consoleErrors).toEqual([]);
  });

  test("customers page renders quick segments and opens history dialog read-only", async ({ page }) => {
    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Zákazníci" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Rýchle segmenty")).toBeVisible();
    await expect(page.getByRole("button", { name: /Aktívni/i })).toBeVisible();

    const rowActionsButton = page.getByRole("button", { name: /Akcie pre /i }).first();
    await expect(rowActionsButton).toBeVisible({ timeout: 10_000 });
    await rowActionsButton.click();
    await page.getByRole("menuitem", { name: /História rezervácií/i }).click();
    await expect(page.getByRole("heading", { name: "História zákazníka" })).toBeVisible({ timeout: 10_000 });
  });

  test("employees page opens edit dialog and keeps restricted services section accessible", async ({ page }) => {
    await page.goto("/admin/employees");
    await expect(page.getByRole("heading", { name: "Tím" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Pridať člena tímu/i })).toBeVisible();

    await page.getByRole("button", { name: /Upraviť profil/i }).first().click();
    await expect(page.getByRole("heading", { name: /Upraviť profil člena|Pridať nového člena tímu/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Priradené služby")).toBeVisible();
    await expect(page.getByTestId("employee-dialog-scroll-container")).toBeVisible();
  });

  test("settings page switches to booking tab and shows booking controls read-only", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Nastavenia", exact: true })).toBeVisible({ timeout: 20_000 });

    const bookingTab = page.getByRole("tab", { name: "Booking" });
    await bookingTab.click();
    await expect(bookingTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText("Nastavenia rezervácií")).toBeVisible();
    await expect(page.getByText(/Povoliť administrátora ako vykonávateľa služby/i)).toBeVisible();
  });
});
