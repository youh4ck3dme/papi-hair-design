import { expect, type Page } from "@playwright/test";

export const ENABLE_ADMIN_E2E = process.env.PLAYWRIGHT_ENABLE_ADMIN_E2E === "1";
export const ENABLE_ADMIN_SMOKE_E2E =
  process.env.PLAYWRIGHT_ENABLE_ADMIN_SMOKE_E2E === "1" || ENABLE_ADMIN_E2E;
export const ENABLE_ADMIN_MUTATION_E2E = process.env.PLAYWRIGHT_ENABLE_ADMIN_MUTATION_E2E === "1";

function readFirstNonEmptyEnv(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return "";
}

export const ADMIN_EMAIL = readFirstNonEmptyEnv(
  process.env.PLAYWRIGHT_ADMIN_EMAIL,
  process.env.PLAYWRIGHT_OWNER_EMAIL,
  process.env.VITE_PRIMARY_OWNER_EMAIL,
  process.env.PRIMARY_OWNER_EMAIL,
  process.env.VITE_PAPI_EMAIL,
);
export const ADMIN_PASSWORD = readFirstNonEmptyEnv(
  process.env.PLAYWRIGHT_ADMIN_PASSWORD,
  process.env.PLAYWRIGHT_ROLE_PASSWORD,
);

if ((ENABLE_ADMIN_E2E || ENABLE_ADMIN_SMOKE_E2E || ENABLE_ADMIN_MUTATION_E2E) && (!ADMIN_EMAIL || !ADMIN_PASSWORD)) {
  throw new Error(
    "Admin Playwright E2E requires explicit credentials. Set PLAYWRIGHT_ADMIN_EMAIL/PLAYWRIGHT_ADMIN_PASSWORD or owner-based fallbacks PLAYWRIGHT_OWNER_EMAIL/PLAYWRIGHT_ROLE_PASSWORD.",
  );
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByTestId("auth-page")).toBeVisible({ timeout: 15_000 });

  const cookieAccept = page.locator('button:has-text("Prijať všetko")');
  if (await cookieAccept.isVisible().catch(() => false)) {
    await cookieAccept.click();
  }

  await page.getByTestId("auth-email-input").fill(ADMIN_EMAIL!);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD!);
  await page.getByTestId("auth-login-btn").click();

  try {
    await expect(page).toHaveURL(/\/(admin|bootstrap)/, { timeout: 20_000 });
  } catch {
    // Preview/local auth can keep us on /auth even after a successful Firebase sign-in.
    // In that case, verify the authenticated session by opening an admin route directly.
    if (page.url().includes("/auth")) {
      await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page).toHaveURL(/\/(admin|bootstrap)/, { timeout: 30_000 });
    } else {
      throw new Error(`Unexpected URL after login attempt: ${page.url()}`);
    }
  }

  if (page.url().includes("/bootstrap")) {
    const activateBtn = page.getByRole("button", { name: "Aktivovať Admin prístup" });
    if (await activateBtn.isVisible().catch(() => false)) {
      await activateBtn.click();
      await expect(page.getByText(/úspešne vytvorené|already_bootstrapped/i)).toBeVisible({ timeout: 15_000 });
    }
  }
}
