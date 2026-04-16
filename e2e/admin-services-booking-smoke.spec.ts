import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim();

async function dismissCookieConsent(page: Page) {
  const cookieAccept = page.locator('button:has-text("Prijať všetko")');
  await cookieAccept.waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  if (await cookieAccept.isVisible().catch(() => false)) {
    await cookieAccept.click({ force: true }).catch(async () => {
      await cookieAccept.evaluate((element) => (element as HTMLButtonElement).click());
    });
  }
}

function isIgnorableRequestFailure(url: string): boolean {
  return (
    url.includes("region1.google-analytics.com/g/collect") ||
    url.includes("fonts.gstatic.com/") ||
    url.includes("google.firestore.v1.Firestore/Write/channel") ||
    url.includes("google.firestore.v1.Firestore/Listen/channel") ||
    url.includes("/normalizeMemberships") ||
    url.includes("/recordBookingFunnelEvent") ||
    url.includes("/src/pages/BootstrapPage.tsx")
  );
}

test.describe("Admin services to booking smoke", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD.");

  test("auth -> admin/services -> booking stays healthy", async ({ page }) => {
    const consoleErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (isIgnorableRequestFailure(url)) {
        return;
      }
      requestFailures.push(`${request.method()} ${url} :: ${request.failure()?.errorText ?? "failed"}`);
    });

    await page.goto("/auth");
    await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15000 });
    await dismissCookieConsent(page);

    await page.getByTestId("auth-email-input").fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD!);
    let reachedAdminShell = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByTestId("auth-login-btn").click();
      const reachedTarget = await Promise.race([
        page.waitForURL(/\/(admin|bootstrap)/, { timeout: 25000 }).then(() => true).catch(() => false),
        page
          .getByRole("heading", { name: /Admin Bootstrap/i })
          .waitFor({ state: "visible", timeout: 25000 })
          .then(() => true)
          .catch(() => false),
      ]);

      if (reachedTarget) {
        reachedAdminShell = true;
        break;
      }
    }

    expect(reachedAdminShell).toBe(true);

    consoleErrors.length = 0;
    requestFailures.length = 0;

    if (page.url().includes("/bootstrap")) {
      const activateButton = page.getByRole("button", { name: /Aktivovať Admin prístup/i });
      if (await activateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await activateButton.click();
      }
    }

    await page.goto("/admin/services");
    await expect(page.getByTestId("admin-services-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Služby", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Dámske služby/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Pánske služby/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Balayage|Farbenie|Brada/i).first()).toBeVisible({ timeout: 10000 });

    await page.goto("/booking");
    await expect(page.getByTestId("booking-page")).toBeVisible({ timeout: 15000 });
    await dismissCookieConsent(page);

    await page.getByTestId("booking-category-damske").click();
    const firstSubcategory = page.locator('[data-testid^="booking-subcategory-"]').first();
    await expect(firstSubcategory).toBeVisible({ timeout: 10000 });
    await firstSubcategory.click();

    const firstService = page.locator('[data-testid^="booking-service-"]').first();
    await expect(firstService).toBeVisible({ timeout: 10000 });

    expect(requestFailures).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
