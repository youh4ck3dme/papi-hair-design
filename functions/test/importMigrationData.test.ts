import { describe, expect, it } from "vitest";
import { hasMatchingAdminSecret } from "../src/importMigrationData";

describe("importMigrationData", () => {
  it("accepts an exact matching admin secret", () => {
    expect(hasMatchingAdminSecret("super-secret", "super-secret")).toBe(true);
  });

  it("rejects different secrets", () => {
    expect(hasMatchingAdminSecret("super-secret", "super-secret-2")).toBe(false);
  });

  it("rejects secrets with different lengths", () => {
    expect(hasMatchingAdminSecret("short", "much-longer-secret")).toBe(false);
  });

  it("trims provided secret before comparison", () => {
    expect(hasMatchingAdminSecret("  super-secret  ", "super-secret")).toBe(true);
  });
});
