import { afterEach, describe, expect, it, vi } from "vitest";

async function importAllowlistModule() {
  vi.resetModules();
  return await import("./adminAllowlist");
}

describe("adminAllowlist env aliases", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts the generic primary owner alias", async () => {
    vi.stubEnv("VITE_PRIMARY_OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("VITE_PAPI_EMAIL", "");

    const module = await importAllowlistModule();

    expect(module.isAdminAllowlisted("OWNER@example.com")).toBe(true);
  });

  it("falls back to legacy owner alias when the generic alias is empty", async () => {
    vi.stubEnv("VITE_PRIMARY_OWNER_EMAIL", " ");
    vi.stubEnv("VITE_PAPI_EMAIL", "legacy-owner@example.com");

    const module = await importAllowlistModule();

    expect(module.isAdminAllowlisted("legacy-owner@example.com")).toBe(true);
  });

  it("merges employee csv aliases with legacy employee emails", async () => {
    vi.stubEnv("VITE_EMPLOYEE_EMAILS", "first@example.com,second@example.com");
    vi.stubEnv("VITE_MISKA_EMAIL", "legacy-one@example.com");
    vi.stubEnv("VITE_MATO_EMAIL", "legacy-two@example.com");

    const module = await importAllowlistModule();

    expect(module.isEmployeeAllowlisted("first@example.com")).toBe(true);
    expect(module.isEmployeeAllowlisted("second@example.com")).toBe(true);
    expect(module.isEmployeeAllowlisted("legacy-one@example.com")).toBe(true);
    expect(module.isEmployeeAllowlisted("legacy-two@example.com")).toBe(true);
  });
});
