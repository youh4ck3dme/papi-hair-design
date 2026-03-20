import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://booking.papihairdesign.sk";
const sharedPassword =
  process.env.PLAYWRIGHT_ROLE_PASSWORD?.trim() ||
  process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim() ||
  "88888888";

const accounts = [
  {
    key: "owner",
    email: process.env.PLAYWRIGHT_OWNER_EMAIL?.trim() || process.env.VITE_PAPI_EMAIL?.trim() || "papi@papihairdesign.sk",
    expectedEmployeesAccess: true,
  },
  {
    key: "mato",
    email: process.env.PLAYWRIGHT_MATO_EMAIL?.trim() || process.env.VITE_MATO_EMAIL?.trim() || "mato@papihairdesign.sk",
    expectedEmployeesAccess: false,
  },
  {
    key: "miska",
    email: process.env.PLAYWRIGHT_MISKA_EMAIL?.trim() || process.env.VITE_MISKA_EMAIL?.trim() || "miska@papihairdesign.sk",
    expectedEmployeesAccess: false,
  },
];

const missingEmail = accounts.find((account) => !account.email);
if (missingEmail) {
  console.error(`Missing email for ${missingEmail.key}. Set PLAYWRIGHT_*_EMAIL env vars.`);
  process.exit(1);
}

function toResultLabel(account) {
  return `${account.key}:${account.email}`;
}

async function login(page, email, password) {
  await page.goto(`${baseURL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-testid="auth-email-input"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('[data-testid="auth-login-btn"]').click();

  await page.waitForTimeout(2_500);
  const urlAfterLogin = page.url();
  if (!/\/(admin|bootstrap|booking)/.test(urlAfterLogin)) {
    const visibleError =
      (await page.locator("text=Invalid login credentials").first().textContent().catch(() => null)) ||
      (await page.locator("text=auth/invalid-credential").first().textContent().catch(() => null)) ||
      (await page.locator("text=Prihlásenie zlyhalo").first().textContent().catch(() => null));
    throw new Error(
      `Login did not navigate away from /auth for ${email}. url=${urlAfterLogin} uiError=${visibleError ?? "n/a"}`,
    );
  }

  if (page.url().includes("/bootstrap")) {
    const activateBtn = page.getByRole("button", { name: "Aktivovať Admin prístup" });
    if (await activateBtn.isVisible().catch(() => false)) {
      await activateBtn.click();
      await page.waitForTimeout(1_500);
    }
  }
}

async function runScenario(browser, account) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    await context.addInitScript(() => {
      localStorage.setItem(
        "cookie_prefs_v1",
        JSON.stringify({
          necessary: true,
          analytics: false,
          marketing: false,
          timestamp: new Date().toISOString(),
        }),
      );
    });

    await login(page, account.email, sharedPassword);

    // Owner can open employees page, employees must be redirected away.
    await page.goto(`${baseURL}/admin/employees`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1_200);
    const employeesUrl = page.url();
    const hasEmployeesHeading = await page
      .locator('h1:has-text("Zamestnanci"),h2:has-text("Zamestnanci")')
      .first()
      .isVisible()
      .catch(() => false);

    const employeesAccessOk = account.expectedEmployeesAccess
      ? hasEmployeesHeading || employeesUrl.includes("/admin/employees")
      : !employeesUrl.includes("/admin/employees");

    if (!employeesAccessOk) {
      throw new Error(
        `Unexpected /admin/employees access. account=${toResultLabel(account)} url=${employeesUrl} heading=${hasEmployeesHeading}`,
      );
    }

    // All 3 accounts should open appointments page.
    await page.goto(`${baseURL}/admin/appointments`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1_000);
    const appointmentsHeadingVisible = await page
      .locator('h1:has-text("Rezervácie"),h2:has-text("Rezervácie")')
      .first()
      .isVisible()
      .catch(() => false);

    if (!appointmentsHeadingVisible) {
      throw new Error(`Appointments page did not render for ${toResultLabel(account)}; url=${page.url()}`);
    }

    const finalUrl = page.url();
    await context.close();
    return {
      account: toResultLabel(account),
      pass: true,
      employeesUrl,
      finalUrl,
    };
  } catch (error) {
    await context.close();
    return {
      account: toResultLabel(account),
      pass: false,
      error: String(error),
    };
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const account of accounts) {
  const result = await runScenario(browser, account);
  results.push(result);
  if (result.pass) {
    console.log(`[PASS] ${result.account} employeesUrl=${result.employeesUrl} finalUrl=${result.finalUrl}`);
  } else {
    console.log(`[FAIL] ${result.account} ${result.error}`);
  }
}

await browser.close();

const failed = results.filter((item) => !item.pass);
if (failed.length > 0) {
  console.error(`Role smoke failed for ${failed.length}/${results.length} account(s).`);
  process.exit(1);
}

console.log(`Role smoke passed for ${results.length}/${results.length} account(s).`);
