import { expect, test, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const HEADER_Y_TOLERANCE_PX = 3;
const MAIN_Y_TOLERANCE_PX = 8;

type PublicLayoutMetrics = {
  headerY: number;
  mainY: number;
};

async function dismissCookieConsent(page: Page) {
  await page.locator('button:has-text("Prijať všetko")').click({ timeout: 3000 }).catch(() => {});
}

async function readBoxY(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable bounding box`).not.toBeNull();
  return Math.round(box!.y);
}

async function readPublicLayoutMetrics(page: Page, path: "/" | "/booking"): Promise<PublicLayoutMetrics> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissCookieConsent(page);

  const mainSelector = path === "/" ? '[data-testid="landing-main-card"]' : '[data-testid="booking-hero-shell"]';
  await expect(page.locator('[data-testid="public-sticky-header"]').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator(mainSelector).first()).toBeVisible({ timeout: 40_000 });
  await page.waitForTimeout(path === "/" ? 3_200 : 500);

  return {
    headerY: await readBoxY(page, '[data-testid="public-sticky-header"]'),
    mainY: await readBoxY(page, mainSelector),
  };
}

test.describe("public mobile layout spacing", () => {
  test("keeps / and /booking header and main shell Y offsets aligned", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    const home = await readPublicLayoutMetrics(page, "/");
    const booking = await readPublicLayoutMetrics(page, "/booking");

    expect(Math.abs(booking.headerY - home.headerY), {
      message: `Expected /booking header Y (${booking.headerY}) to match / header Y (${home.headerY})`,
    }).toBeLessThanOrEqual(HEADER_Y_TOLERANCE_PX);

    expect(Math.abs(booking.mainY - home.mainY), {
      message: `Expected /booking main shell Y (${booking.mainY}) to match / main shell Y (${home.mainY})`,
    }).toBeLessThanOrEqual(MAIN_Y_TOLERANCE_PX);
  });
});
