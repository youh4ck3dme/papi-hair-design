import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://booking.papihairdesign.sk";

const viewports = [
  { name: "tomato-360x640", width: 360, height: 640 },
  { name: "xs-320x568", width: 320, height: 568 },
  { name: "iphone-se-375x667", width: 375, height: 667 },
  { name: "iphone-12-390x844", width: 390, height: 844 },
  { name: "galaxy-s20-412x915", width: 412, height: 915 },
  { name: "iphone-14-pro-max-430x932", width: 430, height: 932 },
  { name: "ipad-mini-768x1024", width: 768, height: 1024 },
];

const outDir = path.join(process.cwd(), "e2e", "e2e-results", "booking-mobile-audit-live");
await fs.mkdir(outDir, { recursive: true });

async function dismissCookieConsent(page) {
  const cookieAccept = page.locator('button:has-text("Prijať všetko")');
  const visible = await cookieAccept.isVisible({ timeout: 4000 }).catch(() => false);
  if (!visible) return false;

  await cookieAccept.click({ force: true }).catch(async () => {
    await cookieAccept.evaluate((el) => el.click());
  });
  await page.waitForTimeout(400);
  return true;
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function clickFirstVisibleSubcategory(page, categoryStep) {
  const buttons = categoryStep.locator("button");
  const buttonCount = await buttons.count();

  for (let i = 0; i < buttonCount; i += 1) {
    const button = buttons.nth(i);
    if (!(await button.isVisible({ timeout: 500 }).catch(() => false))) continue;

    const text = normalizeText((await button.textContent().catch(() => "")) ?? "");
    if (!text) continue;
    if (text.includes("sluzby")) continue;
    if (text.includes("otvorene")) continue;
    if (text.includes("vyberte")) continue;
    if (text.includes("min")) continue;
    if (text.includes("€") || text.includes("eur")) continue;

    await button.click({ force: true });
    await page.waitForTimeout(700);
    return true;
  }

  return false;
}

async function selectFirstService(page) {
  const categoryStep = page.getByTestId("booking-step-category");
  const employeeStep = page.getByTestId("booking-step-employee");
  await categoryStep.waitFor({ state: "visible", timeout: 15_000 });

  const clickVisibleService = async () => {
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    for (let index = 0; index < buttonCount; index += 1) {
      const button = buttons.nth(index);
      if (!(await button.isVisible({ timeout: 500 }).catch(() => false))) continue;

      const text = normalizeText((await button.textContent().catch(() => "")) ?? "");
      if (!text.includes("min")) continue;

      await button.click({ force: true });
      await page.waitForTimeout(700);

      const employeeVisible = await employeeStep.isVisible({ timeout: 2500 }).catch(() => false);
      if (employeeVisible) {
        return true;
      }
    }

    return false;
  };

  if (await clickVisibleService()) return;

  const categoryButtons = categoryStep.locator("div.relative.flex").first().locator("button");
  const categoryCount = await categoryButtons.count();

  for (let i = 0; i < Math.min(3, categoryCount); i += 1) {
    const categoryButton = categoryButtons.nth(i);
    if (!(await categoryButton.isVisible({ timeout: 1000 }).catch(() => false))) continue;

    await categoryButton.click({ force: true });
    await page.waitForTimeout(700);

    if (await clickVisibleService()) return;

    await clickFirstVisibleSubcategory(page, categoryStep);
    if (await clickVisibleService()) return;
  }

  throw new Error("No visible service found in booking category step");
}

async function selectSlot(page) {
  await page.locator('[data-testid^="date-btn-"]').first().waitFor({ state: "visible", timeout: 12_000 });

  const dateButtons = page.locator('[data-testid^="date-btn-"]');
  const dateCount = await dateButtons.count();
  if (dateCount === 0) {
    throw new Error("No available booking dates rendered");
  }

  for (let i = 0; i < Math.min(10, dateCount); i += 1) {
    const dateButton = dateButtons.nth(i);
    await dateButton.scrollIntoViewIfNeeded();
    await dateButton.click({ force: true });
    await page.waitForTimeout(900);

    const loadingSpinner = page.locator("svg.animate-spin");
    await loadingSpinner.first().waitFor({ state: "hidden", timeout: 6000 }).catch(() => {});

    const slots = page.getByTestId("time-slot");
    const slotCount = await slots.count();
    if (slotCount === 0) continue;

    for (let slotIndex = 0; slotIndex < Math.min(3, slotCount); slotIndex += 1) {
      const slot = slots.nth(slotIndex);
      if (!(await slot.isVisible({ timeout: 1000 }).catch(() => false))) continue;

      await slot.click({ force: true }).catch(async () => {
        await slot.evaluate((el) => el.click());
      });

      const detailsVisible = await page
        .getByTestId("booking-step-details")
        .isVisible({ timeout: 2500 })
        .catch(() => false);
      if (detailsVisible) return;
    }
  }

  throw new Error("No date with available time slots found");
}

async function selectFirstEmployee(page) {
  const employeeOptions = page.locator('[data-testid^="employee-card-"]');
  const employeeCount = await employeeOptions.count();

  if (employeeCount === 0) {
    throw new Error("Employee step rendered but no employee options are selectable");
  }

  for (let index = 0; index < employeeCount; index += 1) {
    const employeeOption = employeeOptions.nth(index);
    if (!(await employeeOption.isVisible({ timeout: 1000 }).catch(() => false))) continue;

    await employeeOption.click({ force: true }).catch(async () => {
      await employeeOption.evaluate((el) => el.click());
    });
    await page.waitForTimeout(700);
    return employeeCount;
  }

  throw new Error("Employee step rendered but all employee options are hidden");
}

function hasHorizontalOverflow(metrics) {
  return metrics.docOverflowX > 1 || metrics.bodyOverflowX > 1;
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });

  const page = await context.newPage();
  let pass = false;

  try {
    const response = await page.goto(`${baseURL}/booking`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (!response || response.status() !== 200) {
      throw new Error(`Booking page returned status: ${response?.status() ?? "NO_RESPONSE"}`);
    }

    const cookieAccepted = await dismissCookieConsent(page);

    const initialMetrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      bodyOverflowX: document.body.scrollWidth - window.innerWidth,
    }));

    if (hasHorizontalOverflow(initialMetrics)) {
      throw new Error(
        `Initial horizontal overflow detected (doc:${initialMetrics.docOverflowX}, body:${initialMetrics.bodyOverflowX})`,
      );
    }

    await selectFirstService(page);

    const employeeStep = page.getByTestId("booking-step-employee");
    await employeeStep.waitFor({ state: "visible", timeout: 12_000 });

    const employeeCount = await selectFirstEmployee(page);

    await selectSlot(page);
    await page.getByTestId("booking-step-details").waitFor({ state: "visible", timeout: 18_000 });

    const finalMetrics = await page.evaluate(() => ({
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      bodyOverflowX: document.body.scrollWidth - window.innerWidth,
      bookingDetailsVisible: Boolean(document.querySelector('[data-testid="booking-step-details"]')),
    }));

    if (hasHorizontalOverflow(finalMetrics)) {
      throw new Error(`Final horizontal overflow detected (doc:${finalMetrics.docOverflowX}, body:${finalMetrics.bodyOverflowX})`);
    }

    pass = finalMetrics.bookingDetailsVisible;

    const screenshot = path.join(outDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });

    results.push({
      viewport,
      pass,
      cookieAccepted,
      employeeCount,
      initialMetrics,
      finalMetrics,
      screenshot,
    });

    console.log(
      `${viewport.name}: pass=${pass} cookieAccepted=${cookieAccepted} employees=${employeeCount} overflow=${initialMetrics.docOverflowX}/${finalMetrics.docOverflowX}`,
    );
  } catch (error) {
    const screenshot = path.join(outDir, `${viewport.name}-failed.png`);
    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
    results.push({
      viewport,
      pass: false,
      error: String(error),
      screenshot,
    });
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
  console.error(`Booking live audit failed for ${failed.length} viewport(s). Results: ${resultsPath}`);
  process.exit(1);
}

console.log(`Booking live audit passed for all ${results.length} viewport(s). Results: ${resultsPath}`);
