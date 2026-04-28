export type EmployeeCalendarPermissions = {
  canContactClient: boolean;
  canUpdateOwnBookingStatus: boolean;
  canCreateOwnBookings: boolean;
  canCancelOwnBookings: boolean;
  canMoveOwnBookings: boolean;
  canBlockOwnTime: boolean;
};

export const DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS: Readonly<EmployeeCalendarPermissions> = {
  canContactClient: false,
  canUpdateOwnBookingStatus: false,
  canCreateOwnBookings: false,
  canCancelOwnBookings: false,
  canMoveOwnBookings: false,
  canBlockOwnTime: false,
};

const EMPLOYEE_CALENDAR_PERMISSION_KEYS = [
  "canContactClient",
  "canUpdateOwnBookingStatus",
  "canCreateOwnBookings",
  "canCancelOwnBookings",
  "canMoveOwnBookings",
  "canBlockOwnTime",
] as const satisfies ReadonlyArray<keyof EmployeeCalendarPermissions>;

export function resolveEmployeeCalendarPermissions(
  settings: Partial<Record<keyof EmployeeCalendarPermissions, unknown>> | null | undefined,
): EmployeeCalendarPermissions {
  if (!settings || typeof settings !== "object") {
    return { ...DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS };
  }

  const permissions = { ...DEFAULT_EMPLOYEE_CALENDAR_PERMISSIONS };

  for (const key of EMPLOYEE_CALENDAR_PERMISSION_KEYS) {
    const value = settings[key];
    if (typeof value === "boolean") {
      permissions[key] = value;
    }
  }

  return permissions;
}
