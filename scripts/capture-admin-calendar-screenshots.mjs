import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5678";
const outputDir = path.resolve("docs", "screenshots");
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim();

if (!adminPassword) {
  console.error("Missing PLAYWRIGHT_ADMIN_PASSWORD for admin calendar screenshot capture.");
  process.exit(1);
}

async function maybeClick(locator) {
  if ((await locator.count()) === 0) return false;
  const first = locator.first();
  if (!(await first.isVisible())) return false;
  await first.click({ timeout: 2500 });
  return true;
}

async function maybeFillPassword(page) {
  const passwordInput = page.locator('input[type="password"]').first();
  if ((await passwordInput.count()) === 0) return false;
  if (!(await passwordInput.isVisible())) return false;
  await passwordInput.fill(adminPassword);
  const submitButton = page
    .locator('button[type="submit"]')
    .first();
  if ((await submitButton.count()) > 0 && (await submitButton.isVisible())) {
    await submitButton.click();
  } else {
    await passwordInput.press("Enter");
  }
  return true;
}

async function ensureAdminAccess(page) {
  await page.goto(`${baseUrl}/admin/calendar`, { waitUntil: "domcontentloaded", timeout: 30000 });

  if (page.url().includes("/admin/calendar")) {
    return;
  }

  if (page.url().includes("/team-login") || page.url().includes("/papihairsalon2026")) {
    await maybeClick(page.getByRole("button", { name: /vstup|team|calendar|profil/i }));
    await page.waitForTimeout(400);

    await maybeFillPassword(page);
    await page.waitForTimeout(500);

    await maybeClick(page.getByRole("button", { name: /papi/i }));
    await page.waitForTimeout(500);

    await maybeFillPassword(page);
    await page.waitForTimeout(900);
  }

  await page.goto(`${baseUrl}/admin/calendar`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);
}

async function run() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await ensureAdminAccess(page);

  await page.setViewportSize({ width: 1440, height: 920 });
  await page.goto(`${baseUrl}/admin/calendar`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(outputDir, "admin-calendar-desktop-after.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/admin/calendar`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(outputDir, "admin-calendar-mobile-after.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("Screenshots saved to", outputDir);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
