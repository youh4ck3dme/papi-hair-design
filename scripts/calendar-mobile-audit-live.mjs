import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://booking.papihairdesign.sk";
const email = process.env.PLAYWRIGHT_ADMIN_EMAIL?.trim();
const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim();

if (!email || !password) {
  console.error("Missing credentials. Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD.");
  process.exit(1);
}

const viewports = [
  { name: "tomato-360x640", width: 360, height: 640 },
  { name: "xs-320x568", width: 320, height: 568 },
  { name: "iphone-se-375x667", width: 375, height: 667 },
  { name: "iphone-12-390x844", width: 390, height: 844 },
  { name: "galaxy-s20-412x915", width: 412, height: 915 },
  { name: "iphone-14-pro-max-430x932", width: 430, height: 932 },
  { name: "ipad-mini-768x1024", width: 768, height: 1024 },
];

const outDir = path.join(process.cwd(), "e2e", "e2e-results", "calendar-mobile-audit-live");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });

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

  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/auth`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator('[data-testid="auth-email-input"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('[data-testid="auth-login-btn"]').click();
    await page.waitForURL(/\/(admin|bootstrap)/, { timeout: 30_000 });

    if (page.url().includes("/bootstrap")) {
      const activateBtn = page.getByRole("button", { name: "Aktivovať Admin prístup" });
      if (await activateBtn.isVisible().catch(() => false)) {
        await activateBtn.click();
        await page.waitForTimeout(1_500);
      }
    }

    await page.goto(`${baseURL}/admin/calendar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator('h1:has-text("Kalendár")').waitFor({ timeout: 30_000 });

    const dayView = page.getByRole("radio", { name: /^Deň$/ }).first();
    if (await dayView.isVisible().catch(() => false)) {
      await dayView.click();
      await page.waitForTimeout(900);
    }

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const root = document.querySelector(".calendar-page-root");
      const shell = document.querySelector(".calendar-page-shell");

      const slotButtons = document.querySelectorAll(
        '[role="button"][aria-label*="Vybrať čas okolo"],[role="button"][aria-label*="around"]',
      ).length;

      const rootRect = root?.getBoundingClientRect();
      const shellRect = shell?.getBoundingClientRect();

      const suspiciousOverflowNodes = Array.from(document.querySelectorAll<HTMLElement>("*"))
        .filter((el) => el.scrollWidth - el.clientWidth > 1)
        .slice(0, 5)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString().slice(0, 80) ?? "",
          overflowX: el.scrollWidth - el.clientWidth,
        }));

      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        docOverflowX: doc.scrollWidth - window.innerWidth,
        bodyOverflowX: body.scrollWidth - window.innerWidth,
        rootHeight: rootRect ? Math.round(rootRect.height) : null,
        shellHeight: shellRect ? Math.round(shellRect.height) : null,
        slotButtons,
        suspiciousOverflowNodes,
      };
    });

    const screenshot = path.join(outDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });

    const rootHeightMatchesViewport =
      metrics.rootHeight !== null && Math.abs(metrics.rootHeight - metrics.innerHeight) <= 1;
    const pass =
      metrics.docOverflowX <= 1 &&
      metrics.bodyOverflowX <= 1 &&
      metrics.slotButtons > 0 &&
      rootHeightMatchesViewport;

    results.push({
      viewport,
      pass,
      ...metrics,
      screenshot,
      rootHeightMatchesViewport,
    });

    console.log(
      `${viewport.name}: pass=${pass} overflow=${metrics.docOverflowX}/${metrics.bodyOverflowX} root=${metrics.rootHeight}/${metrics.innerHeight} shell=${metrics.shellHeight} slots=${metrics.slotButtons}`,
    );
  } catch (error) {
    results.push({ viewport, pass: false, error: String(error) });
    console.log(`${viewport.name}: pass=false error=${String(error)}`);
  } finally {
    await context.close();
  }
}

await browser.close();

const resultsPath = path.join(outDir, "results.json");
await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), "utf8");

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
  console.error(`Audit failed for ${failed.length} viewport(s). Results: ${resultsPath}`);
  process.exit(1);
}

console.log(`Audit passed for all ${results.length} viewport(s). Results: ${resultsPath}`);
