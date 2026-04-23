import { afterEach, describe, expect, it, vi } from "vitest";

async function importBusinessConfig() {
  vi.resetModules();
  return await import("../src/businessConfig");
}

describe("businessConfig", () => {
  afterEach(() => {
    delete process.env.PRIMARY_BUSINESS_ID;
    delete process.env.PRIMARY_BUSINESS_NAME;
    delete process.env.BOOTSTRAP_OWNER_EMAILS;
    delete process.env.PRIMARY_OWNER_EMAIL;
    delete process.env.BOOTSTRAP_EMPLOYEE_EMAILS;
    delete process.env.VITE_EMPLOYEE_EMAILS;
    delete process.env.VITE_PAPI_EMAIL;
    delete process.env.VITE_MATO_EMAIL;
    delete process.env.VITE_MISKA_EMAIL;
    vi.resetModules();
  });

  it("uses generic env aliases for the default business and owner config", async () => {
    process.env.PRIMARY_BUSINESS_ID = "tenant-main";
    process.env.PRIMARY_BUSINESS_NAME = "Tenant Studio";
    process.env.PRIMARY_OWNER_EMAIL = "Owner@Example.com";

    const module = await importBusinessConfig();

    expect(module.DEFAULT_BUSINESS_ID).toBe("tenant-main");
    expect(module.DEFAULT_BUSINESS_NAME).toBe("Tenant Studio");
    expect([...module.BOOTSTRAP_OWNER_EMAILS]).toEqual(["owner@example.com"]);
  });

  it("merges employee aliases across generic and legacy env vars", async () => {
    process.env.BOOTSTRAP_EMPLOYEE_EMAILS = "alpha@example.com";
    process.env.VITE_EMPLOYEE_EMAILS = "beta@example.com,alpha@example.com";
    process.env.VITE_MATO_EMAIL = "mato@example.com";
    process.env.VITE_MISKA_EMAIL = "miska@example.com";

    const module = await importBusinessConfig();

    expect(module.BOOTSTRAP_EMPLOYEE_EMAILS).toEqual([
      "alpha@example.com",
      "beta@example.com",
      "mato@example.com",
      "miska@example.com",
    ]);
  });
});
