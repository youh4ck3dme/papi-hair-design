import { afterEach, describe, expect, it, vi } from "vitest";

const CONFIG_ENV_KEYS = [
  "PRIMARY_BUSINESS_ID",
  "PRIMARY_BUSINESS_NAME",
  "BOOTSTRAP_OWNER_EMAILS",
  "PRIMARY_OWNER_EMAIL",
  "BOOTSTRAP_EMPLOYEE_EMAILS",
  "VITE_EMPLOYEE_EMAILS",
  "VITE_PAPI_EMAIL",
  "VITE_MATO_EMAIL",
  "VITE_MISKA_EMAIL",
];

async function importBusinessConfig() {
  vi.resetModules();
  return await import("../src/businessConfig");
}

describe("businessConfig", () => {
  afterEach(() => {
    CONFIG_ENV_KEYS.forEach((key) => delete process.env[key]);
    vi.resetModules();
  });

  it("uses generic env aliases for the default business and owner config", async () => {
    Object.assign(process.env, {
      PRIMARY_BUSINESS_ID: "tenant-main",
      PRIMARY_BUSINESS_NAME: "Tenant Studio",
      PRIMARY_OWNER_EMAIL: "Owner@Example.com",
    });

    const module = await importBusinessConfig();

    expect(module.DEFAULT_BUSINESS_ID).toBe("tenant-main");
    expect(module.DEFAULT_BUSINESS_NAME).toBe("Tenant Studio");
    expect([...module.BOOTSTRAP_OWNER_EMAILS]).toEqual(["owner@example.com"]);
    expect(module.isBootstrapOwnerEmail("OWNER@example.com")).toBe(true);
  });

  it("merges employee aliases across generic and legacy env vars", async () => {
    Object.assign(process.env, {
      BOOTSTRAP_EMPLOYEE_EMAILS: "alpha@example.com",
      VITE_EMPLOYEE_EMAILS: "beta@example.com,alpha@example.com",
      VITE_MATO_EMAIL: "mato@example.com",
      VITE_MISKA_EMAIL: "miska@example.com",
    });

    const module = await importBusinessConfig();

    expect(module.BOOTSTRAP_EMPLOYEE_EMAILS).toEqual([
      "alpha@example.com",
      "beta@example.com",
      "mato@example.com",
      "miska@example.com",
    ]);
  });
});
