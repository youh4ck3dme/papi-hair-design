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

  it.each([
    {
      env: { VITE_PRIMARY_OWNER_EMAIL: "owner@example.com", VITE_PAPI_EMAIL: "" },
      email: "OWNER@example.com",
    },
    {
      env: { VITE_PRIMARY_OWNER_EMAIL: " ", VITE_PAPI_EMAIL: "legacy-owner@example.com" },
      email: "legacy-owner@example.com",
    },
  ])("allows configured owner alias %#", async ({ env, email }) => {
    Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));
    expect((await importAllowlistModule()).isAdminAllowlisted(email)).toBe(true);
  });

  it("merges employee csv aliases with legacy employee emails", async () => {
    vi.stubEnv("VITE_EMPLOYEE_EMAILS", "first@example.com,second@example.com");
    vi.stubEnv("VITE_MISKA_EMAIL", "legacy-one@example.com");
    vi.stubEnv("VITE_MATO_EMAIL", "legacy-two@example.com");

    const module = await importAllowlistModule();

    for (const email of [
      "first@example.com",
      "second@example.com",
      "legacy-one@example.com",
      "legacy-two@example.com",
    ]) {
      expect(module.isEmployeeAllowlisted(email)).toBe(true);
    }
  });
});
