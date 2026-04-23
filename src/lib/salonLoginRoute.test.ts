import { describe, expect, it } from "vitest";

import { LEGACY_SALON_LOGIN_PATH, SALON_LOGIN_PATH, isSalonLoginRoute } from "./salonLoginRoute";

describe("salonLoginRoute", () => {
  it("recognizes the canonical salon login route", () => {
    expect(isSalonLoginRoute(SALON_LOGIN_PATH)).toBe(true);
    expect(isSalonLoginRoute(`${SALON_LOGIN_PATH}/owner`)).toBe(true);
  });

  it("keeps the legacy salon login alias recognized for redirects", () => {
    expect(isSalonLoginRoute(LEGACY_SALON_LOGIN_PATH)).toBe(true);
  });

  it("does not match unrelated public routes", () => {
    expect(isSalonLoginRoute("/auth")).toBe(false);
    expect(isSalonLoginRoute("/booking")).toBe(false);
  });
});
