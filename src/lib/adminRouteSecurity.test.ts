import { describe, expect, it } from "vitest";

import {
  ADMIN_CALENDAR_PATH,
  hasOwnerAdminMembershipForBusiness,
  sanitizeAdminReturnTo,
} from "./adminRouteSecurity";

describe("adminRouteSecurity", () => {
  it("allows only internal admin paths as return targets", () => {
    expect(sanitizeAdminReturnTo("/admin/calendar")).toBe("/admin/calendar");
    expect(sanitizeAdminReturnTo("/admin/calendar?day=2026-04-24")).toBe("/admin/calendar?day=2026-04-24");
  });

  it.each([
    "",
    "/booking",
    "/admin/login",
    "/admin/login?returnTo=/admin/calendar",
    "https://example.com/admin/calendar",
    "//example.com/admin/calendar",
    "/admin\\calendar",
    "/admin/%5c%5cexample.com",
    "/admin/%2f%2fevil.test",
    "/admin/%252f%252fevil.test",
    "/admin/%3aevil",
    "%2f%2fevil.test/admin/calendar",
  ])("falls back for unsafe returnTo value %s", (value) => {
    expect(sanitizeAdminReturnTo(value)).toBe(ADMIN_CALENDAR_PATH);
  });

  it("requires owner/admin membership on the same business tenant", () => {
    expect(
      hasOwnerAdminMembershipForBusiness(
        [
          { business_id: "other-business", role: "owner" },
          { business_id: "biz-1", role: "employee" },
        ],
        "biz-1",
      ),
    ).toBe(false);

    expect(
      hasOwnerAdminMembershipForBusiness(
        [
          { business_id: "biz-1", role: "admin" },
          { business_id: "other-business", role: "customer" },
        ],
        "biz-1",
      ),
    ).toBe(true);
  });
});
