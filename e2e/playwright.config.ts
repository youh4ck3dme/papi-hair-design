import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5678";

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "e2e-results/html-report", open: "never" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  timeout: 30_000,
  expect: { timeout: 10_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  outputDir: "e2e-results/test-results",
  // Auto-start dev server if not already running on :8080.
  // reuseExistingServer=true → locally reuse a running `npm run dev`
  // reuseExistingServer=false on CI → always start a fresh server
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5678",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
