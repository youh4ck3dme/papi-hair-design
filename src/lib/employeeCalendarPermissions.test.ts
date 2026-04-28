import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS,
  resolveEmployeeCalendarPermissions,
} from "./employeeCalendarPermissions";

describe("resolveEmployeeCalendarPermissions", () => {
  it("defaults missing settings to read-only", () => {
    expect(resolveEmployeeCalendarPermissions(null)).toEqual(DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS);
    expect(resolveEmployeeCalendarPermissions(undefined)).toEqual(DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS);
  });

  it("keeps invalid settings locked down", () => {
    expect(
      resolveEmployeeCalendarPermissions({
        canContactClient: "true",
        canCreateOwnBookings: 1,
        canBlockOwnTime: {},
      }),
    ).toEqual(DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS);
  });

  it("accepts explicit boolean permissions", () => {
    expect(
      resolveEmployeeCalendarPermissions({
        canContactClient: true,
        canUpdateOwnBookingStatus: true,
      }),
    ).toEqual({
      ...DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS,
      canContactClient: true,
      canUpdateOwnBookingStatus: true,
    });
  });
});
