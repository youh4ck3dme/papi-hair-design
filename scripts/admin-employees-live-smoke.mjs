import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://booking.papihairdesign.sk";
const ownerEmail = process.env.PLAYWRIGHT_OWNER_EMAIL?.trim() || process.env.VITE_PRIMARY_OWNER_EMAIL?.trim() || process.env.PRIMARY_OWNER_EMAIL?.trim() || process.env.VITE_PAPI_EMAIL?.trim();
const ownerPassword =
  process.env.PLAYWRIGHT_ROLE_PASSWORD?.trim() ||
  process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim();

if (!ownerEmail || !ownerPassword) {
  console.error("Missing live smoke credentials. Set PLAYWRIGHT_OWNER_EMAIL and PLAYWRIGHT_ROLE_PASSWORD explicitly.");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "e2e", "e2e-results", "admin-employees-live-smoke");
await fs.mkdir(outDir, { recursive: true });

const expectedEmployees = [
  { name: "Mato", expectedUrl: "/mato.webp" },
  { name: "Miska", expectedUrl: "/miska.webp" },
  { name: "Papi", expectedUrl: "/papi.webp" },
];

function formatError(error) {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

async function login(page) {
  await page.goto(`${baseURL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-testid="auth-email-input"]').fill(ownerEmail);
  await page.locator('input[type="password"]').fill(ownerPassword);
  await page.locator('[data-testid="auth-login-btn"]').click();
  await page.waitForTimeout(3_000);
}

async function dismissCookieConsent(page) {
  const cookieAccept = page.getByRole("button", { name: /prijať všetko/i });
  if (!(await cookieAccept.isVisible({ timeout: 3_000 }).catch(() => false))) return false;
  await cookieAccept.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  return true;
}

async function waitForEmployeesContent(page) {
  const loadingText = page.getByText("Načítavam zoznam tímu...");
  const firstEmployeeHeading = page.getByRole("heading", { name: "Mato" });

  if (await loadingText.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loadingText.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  }

  await firstEmployeeHeading.waitFor({ state: "visible", timeout: 20_000 });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 920 } });
const page = await context.newPage();
const consoleErrors = [];
const consoleWarnings = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
  if (message.type() === "warning") consoleWarnings.push(message.text());
});

try {
  await login(page);
  await page.goto(`${baseURL}/admin/employees`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2_000);
  await dismissCookieConsent(page);
  await waitForEmployeesContent(page);

  const headerLogo = await page.locator('img[alt="PAPI HAIR DESIGN"]').first().evaluate((img) => ({
    src: img.getAttribute("src"),
    currentSrc: img.currentSrc,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  }));

  if (!headerLogo.currentSrc.includes("/phd-logo.png")) {
    throw new Error(`Unexpected admin header logo asset: ${headerLogo.currentSrc}`);
  }

  const employees = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("div.group.relative")).map((card) => {
      const name = card.querySelector("h3")?.textContent?.trim() ?? "";
      const avatarHost = Array.from(card.querySelectorAll("div")).find((element) => {
        const styles = globalThis.getComputedStyle(element);
        return styles.backgroundImage && styles.backgroundImage !== "none";
      });

      return {
        name,
        found: Boolean(name),
        backgroundImage: avatarHost ? globalThis.getComputedStyle(avatarHost).backgroundImage : "none",
      };
    });
  });

  for (const expected of expectedEmployees) {
    const match = employees.find((employee) => employee.name === expected.name);
    if (!match?.found) {
      throw new Error(`Employee card not found: ${expected.name}`);
    }

    if (!match.backgroundImage.includes(expected.expectedUrl)) {
      throw new Error(
        `Unexpected avatar for ${expected.name}. expected=${expected.expectedUrl} actual=${match.backgroundImage}`,
      );
    }
  }

  const screenshot = path.join(outDir, "admin-employees.png");
  await page.screenshot({ path: screenshot, fullPage: true });

  const results = {
    pass: true,
    headerLogo,
    employees,
    consoleErrors,
    consoleWarnings,
    screenshot,
  };

  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2), "utf8");
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  const screenshot = path.join(outDir, "admin-employees-failed.png");
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

  const results = {
    pass: false,
    error: formatError(error),
    consoleErrors,
    consoleWarnings,
    screenshot,
  };

  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2), "utf8");
  console.error(JSON.stringify(results, null, 2));
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
