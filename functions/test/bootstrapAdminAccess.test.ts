import { describe, expect, it } from "vitest";
import { resolveBootstrapRole } from "../src/bootstrapAdminAccess";

describe("resolveBootstrapRole", () => {
  it("returns null when email is not allowlisted", () => {
    expect(resolveBootstrapRole("uid-1", [], false)).toBeNull();
  });

  it("returns owner when business has no owner yet", () => {
    expect(resolveBootstrapRole("uid-1", [], true)).toBe("owner");
  });

  it("returns owner when uid is already an owner in legacy data", () => {
    expect(resolveBootstrapRole("uid-1", ["uid-1", "uid-2"], true)).toBe("owner");
  });

  it("returns admin when owner already exists and uid is different", () => {
    expect(resolveBootstrapRole("uid-3", ["uid-1"], true)).toBe("admin");
  });
});
