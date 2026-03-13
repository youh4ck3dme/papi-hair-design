/**
 * Availability Engine
 * Generates available time slots respecting:
 * - Business hours (from business_hours table with mode support)
 * - Date overrides (from business_date_overrides table)
 * - Employee schedules
 * - Service duration + buffer
 * - Lead time & max days ahead
 * - Existing appointments (conflict detection)
 * - Timezone (Europe/Bratislava default)
 */

import { addMinutes, startOfDay, isBefore, isAfter, format } from "date-fns";

export interface BusinessHours {
  [day: string]: { open: boolean; start: string; end: string };
}

export interface BusinessHourEntry {
  day_of_week: string;
  mode: "open" | "closed" | "on_request";
  start_time: string;
  end_time: string;
}

export interface DateOverrideEntry {
  override_date: string;
  mode: "open" | "closed" | "on_request";
  start_time: string | null;
  end_time: string | null;
}

export interface EmployeeSchedule {
  day_of_week: string;
  start_time: string; // "HH:mm"
  end_time: string;
}

export interface ExistingAppointment {
  start_at: string;
  end_at: string;
  employee_id?: string;
  status?: string;
  hold_expires_at?: string | null;
}

export interface SlotGeneratorInput {
  date: Date;
  serviceDuration: number;
  serviceBuffer: number;
  openingHours: BusinessHours;
  businessHourEntries?: BusinessHourEntry[];
  dateOverrides?: DateOverrideEntry[];
  employeeSchedules: EmployeeSchedule[];
  existingAppointments: ExistingAppointment[];
  leadTimeMinutes?: number;
  slotInterval?: number;
}

export interface SharedSlotGeneratorInput {
  date: Date;
  serviceDuration: number;
  serviceBuffer: number;
  openingHours: BusinessHours;
  businessHourEntries?: BusinessHourEntry[];
  dateOverrides?: DateOverrideEntry[];
  employeeIds: string[];
  employeeSchedulesById?: Record<string, EmployeeSchedule[]>;
  existingAppointments: ExistingAppointment[];
  leadTimeMinutes?: number;
  slotInterval?: number;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DEFAULT_INTERVAL = { start: "08:00", end: "18:00" };

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function setTimeOnDate(date: Date, timeStr: string): Date {
  const d = new Date(date);
  const [h, m] = timeStr.split(":").map(Number);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

function getEmployeeWindow(
  date: Date,
  businessStart: Date,
  businessEnd: Date,
  employeeSchedules: EmployeeSchedule[]
): { start: Date; end: Date } | null {
  const dayName = DAY_NAMES[date.getDay()];
  const empDay = employeeSchedules.find((schedule) => schedule.day_of_week === dayName);
  const empStart = empDay ? setTimeOnDate(date, empDay.start_time) : null;
  const empEnd = empDay ? setTimeOnDate(date, empDay.end_time) : null;

  const windowStart = empStart && isAfter(empStart, businessStart) ? empStart : businessStart;
  const windowEnd = empEnd && isBefore(empEnd, businessEnd) ? empEnd : businessEnd;

  if (isAfter(windowStart, windowEnd) || windowStart.getTime() === windowEnd.getTime()) {
    return null;
  }

  return { start: windowStart, end: windowEnd };
}

function isBlockingAppointment(appointment: ExistingAppointment, now = Date.now()): boolean {
  if (appointment.status === "cancelled" || appointment.status === "expired") {
    return false;
  }

  if (
    appointment.status === "hold_created" &&
    appointment.hold_expires_at &&
    new Date(appointment.hold_expires_at).getTime() < now
  ) {
    return false;
  }

  return true;
}

/**
 * Get effective business intervals for a given date, considering overrides.
 * Returns null if closed/on_request (no slots), or array of {start, end} intervals.
 */
export function getEffectiveIntervals(
  date: Date,
  businessHourEntries?: BusinessHourEntry[],
  dateOverrides?: DateOverrideEntry[],
  legacyHours?: BusinessHours,
): { start: string; end: string }[] | null {
  const dayName = DAY_NAMES[date.getDay()];
  const dateStr = format(date, "yyyy-MM-dd");

  // Check date overrides first
  if (dateOverrides?.length) {
    const dayOverrides = dateOverrides.filter((o) => o.override_date === dateStr);
    if (dayOverrides.length) {
      // If any closed override exists, no slots
      if (dayOverrides.some((o) => o.mode === "closed")) return null;
      // If on_request, no slots
      if (dayOverrides.some((o) => o.mode === "on_request")) return null;
      // Collect open intervals
      const intervals = dayOverrides
        .filter((o) => o.mode === "open" && o.start_time && o.end_time)
        .map((o) => ({ start: o.start_time!.slice(0, 5), end: o.end_time!.slice(0, 5) }));
      return intervals.length ? intervals : null;
    }
  }

  // Use new business_hours table if available
  if (businessHourEntries?.length) {
    const dayEntries = businessHourEntries.filter((h) => h.day_of_week === dayName);
    if (!dayEntries.length) return null;
    // closed or on_request = no slots
    if (dayEntries.every((h) => h.mode !== "open")) return null;
    return dayEntries
      .filter((h) => h.mode === "open")
      .map((h) => ({ start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) }));
  }

  // Fallback to legacy openingHours jsonb
  if (legacyHours) {
    const businessDay = legacyHours[dayName];
    if (businessDay && businessDay.open) {
      return [{ start: businessDay.start, end: businessDay.end }];
    }
    if (businessDay && !businessDay.open) {
      return null;
    }
  }

  // Fallback: default 08:00–18:00 when nothing configured
  return [DEFAULT_INTERVAL];
}

export function generateSlots(input: SlotGeneratorInput): Date[] {
  const {
    date,
    serviceDuration,
    serviceBuffer,
    openingHours,
    businessHourEntries,
    dateOverrides,
    employeeSchedules,
    existingAppointments,
    leadTimeMinutes = 0,
    slotInterval = 30,
  } = input;

  const totalDuration = serviceDuration + serviceBuffer;
  const dayName = DAY_NAMES[date.getDay()];
  const slots: Date[] = [];

  // Get effective business intervals
  const intervals = getEffectiveIntervals(date, businessHourEntries, dateOverrides, openingHours);
  if (!intervals || !intervals.length) return slots;

  // Check employee schedule for this day. If schedule is missing, fallback to business intervals.
  const now = new Date();
  const earliestAllowed = addMinutes(now, leadTimeMinutes);

  const conflicts = existingAppointments.filter((appointment) => isBlockingAppointment(appointment)).map((a) => ({
    start: new Date(a.start_at).getTime(),
    end: new Date(a.end_at).getTime(),
  }));

  // Generate slots for each business interval
  for (const interval of intervals) {
    const businessStart = setTimeOnDate(date, interval.start);
    const businessEnd = setTimeOnDate(date, interval.end);

    // Effective window = intersection of business interval and employee schedule.
    // If employee day schedule is missing, use business interval as fallback.
    const employeeWindow = getEmployeeWindow(date, businessStart, businessEnd, employeeSchedules);
    if (!employeeWindow) continue;

    let cursor = new Date(employeeWindow.start);
    while (cursor < employeeWindow.end) {
      const slotEnd = addMinutes(cursor, totalDuration);
      if (isAfter(slotEnd, employeeWindow.end)) break;

      if (!isBefore(cursor, earliestAllowed)) {
        const slotStartMs = cursor.getTime();
        const slotEndMs = slotEnd.getTime();
        const hasConflict = conflicts.some(
          (c) => slotStartMs < c.end && slotEndMs > c.start
        );
        if (!hasConflict) {
          slots.push(new Date(cursor));
        }
      }

      cursor = addMinutes(cursor, slotInterval);
    }
  }

  return slots;
}

export function generateSharedSlots(input: SharedSlotGeneratorInput): Date[] {
  const {
    date,
    serviceDuration,
    serviceBuffer,
    openingHours,
    businessHourEntries,
    dateOverrides,
    employeeIds,
    employeeSchedulesById = {},
    existingAppointments,
    leadTimeMinutes = 0,
    slotInterval = 30,
  } = input;

  if (!employeeIds.length) {
    return [];
  }

  const slots: Date[] = [];
  const totalDuration = serviceDuration + serviceBuffer;
  const intervals = getEffectiveIntervals(date, businessHourEntries, dateOverrides, openingHours);
  if (!intervals?.length) {
    return [];
  }

  const now = new Date();
  const earliestAllowed = addMinutes(now, leadTimeMinutes);
  const activeAppointments = existingAppointments.filter((appointment) => isBlockingAppointment(appointment));

  for (const interval of intervals) {
    const businessStart = setTimeOnDate(date, interval.start);
    const businessEnd = setTimeOnDate(date, interval.end);

    let cursor = new Date(businessStart);
    while (cursor < businessEnd) {
      const slotEnd = addMinutes(cursor, totalDuration);
      if (isAfter(slotEnd, businessEnd)) break;

      if (!isBefore(cursor, earliestAllowed)) {
        const slotStartMs = cursor.getTime();
        const slotEndMs = slotEnd.getTime();

        const hasAvailableEmployee = employeeIds.some((employeeId) => {
          const employeeWindow = getEmployeeWindow(
            date,
            businessStart,
            businessEnd,
            employeeSchedulesById[employeeId] ?? []
          );

          if (!employeeWindow) {
            return false;
          }

          if (slotStartMs < employeeWindow.start.getTime() || slotEndMs > employeeWindow.end.getTime()) {
            return false;
          }

          return !activeAppointments.some((appointment) => {
            if (appointment.employee_id !== employeeId) {
              return false;
            }

            const conflictStart = new Date(appointment.start_at).getTime();
            const conflictEnd = new Date(appointment.end_at).getTime();
            if (Number.isNaN(conflictStart) || Number.isNaN(conflictEnd)) {
              return false;
            }

            return slotStartMs < conflictEnd && slotEndMs > conflictStart;
          });
        });

        if (hasAvailableEmployee) {
          slots.push(new Date(cursor));
        }
      }

      cursor = addMinutes(cursor, slotInterval);
    }
  }

  return slots;
}

/**
 * Check if a specific slot is available
 */
export function isSlotAvailable(
  slotStart: Date,
  serviceDuration: number,
  serviceBuffer: number,
  existingAppointments: ExistingAppointment[]
): boolean {
  const slotEnd = addMinutes(slotStart, serviceDuration + serviceBuffer);
  const slotStartMs = slotStart.getTime();
  const slotEndMs = slotEnd.getTime();

  return !existingAppointments.some(
    (a) => slotStartMs < new Date(a.end_at).getTime() && slotEndMs > new Date(a.start_at).getTime()
  );
}
