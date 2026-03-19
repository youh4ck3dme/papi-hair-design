import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  BUSINESS_TZ,
  calculateOverlapGroups,
  formatDateSk,
  formatDateTimeRangeSk,
  formatDateTimeSk,
  formatTime,
  normalizeAppointment,
  parseToTimezone,
  parseToTimezoneAsLocal,
  toRBCEvent,
} from "./calendar-utils";
import { formatTimeInTZ, getTimeInTZ } from "./timezone";

describe("calendar-utils", () => {
  it("parses ISO timestamps without changing the original instant", () => {
    const iso = "2026-03-13T09:15:00.000Z";

    expect(parseToTimezone(iso, BUSINESS_TZ).toISOString()).toBe(iso);
  });

  it("creates local wall-clock date from target timezone time", () => {
    const iso = "2026-07-10T09:15:00.000Z";
    const expected = getTimeInTZ(parseISO(iso), BUSINESS_TZ);
    const localDate = parseToTimezoneAsLocal(iso, BUSINESS_TZ);

    expect(localDate.getHours()).toBe(expected.hours);
    expect(localDate.getMinutes()).toBe(expected.minutes);
    expect(localDate.getSeconds()).toBe(0);
    expect(localDate.getMilliseconds()).toBe(0);
  });

  it("normalizes appointments with safe fallbacks and employee in title", () => {
    const normalized = normalizeAppointment({
      id: "apt-1",
      start_at: "2026-03-13T09:00:00.000Z",
      end_at: "2026-03-13T09:45:00.000Z",
      status: "confirmed",
      service_name: "  ",
      employee_name: "  Eva  ",
      customer_name: "",
      notes: null,
    });

    expect(normalized.serviceName).toBe("Bez názvu služby");
    expect(normalized.customerName).toBe("Neznámy klient");
    expect(normalized.employeeName).toBe("Eva");
    expect(normalized.displayTitle).toBe("Neznámy klient – Bez názvu služby (Eva)");
    expect(normalized.displayTime).toBe(
      `${formatTimeInTZ(normalized.startAt, BUSINESS_TZ)} – ${formatTimeInTZ(normalized.endAt, BUSINESS_TZ)}`,
    );
    expect(normalized.notes).toBeUndefined();
  });

  it("omits employee suffix in display title when employee name is missing", () => {
    const normalized = normalizeAppointment({
      id: "apt-2",
      start_at: "2026-03-13T11:00:00.000Z",
      end_at: "2026-03-13T11:30:00.000Z",
      status: "pending",
      service_name: "Strih",
      customer_name: "Jana",
    });

    expect(normalized.displayTitle).toBe("Jana – Strih");
  });

  it("maps normalized appointment to react-big-calendar event shape", () => {
    const normalized = normalizeAppointment({
      id: "apt-3",
      start_at: "2026-03-13T08:00:00.000Z",
      end_at: "2026-03-13T08:30:00.000Z",
      status: "confirmed",
      service_name: "Styling",
      customer_name: "Mia",
    });

    expect(toRBCEvent(normalized)).toEqual({
      id: "apt-3",
      title: normalized.displayTitle,
      start: normalized.startAt,
      end: normalized.endAt,
      status: "confirmed",
      resource: normalized,
    });
  });

  it("formats date and time helpers in Slovak display format", () => {
    const start = new Date(2026, 2, 13, 9, 5);
    const end = new Date(2026, 2, 13, 10, 45);

    expect(formatTime(start)).toBe("09:05");
    expect(formatDateSk(start)).toBe("13. 3. 2026");
    expect(formatDateTimeSk(start)).toBe("13. 3. 2026 09:05");
    expect(formatDateTimeRangeSk(start, end)).toBe("13. 3. 2026 09:05 – 10:45");
  });

  it("calculates layout metadata for appointments on the selected day only", () => {
    const sameDayA = normalizeAppointment({
      id: "apt-a",
      start_at: "2026-03-13T08:00:00.000Z",
      end_at: "2026-03-13T08:30:00.000Z",
      status: "confirmed",
      service_name: "A",
      customer_name: "A",
    });
    const sameDayB = normalizeAppointment({
      id: "apt-b",
      start_at: "2026-03-13T10:00:00.000Z",
      end_at: "2026-03-13T10:30:00.000Z",
      status: "confirmed",
      service_name: "B",
      customer_name: "B",
    });
    const otherDay = normalizeAppointment({
      id: "apt-c",
      start_at: "2026-03-14T10:00:00.000Z",
      end_at: "2026-03-14T10:30:00.000Z",
      status: "confirmed",
      service_name: "C",
      customer_name: "C",
    });

    const result = calculateOverlapGroups(
      [sameDayB, otherDay, sameDayA],
      new Date("2026-03-13T12:00:00.000Z"),
      BUSINESS_TZ,
    );

    expect(result.appointments).toHaveLength(2);
    expect(result.appointments.map((item) => item.id)).toEqual(["apt-a", "apt-b"]);
    expect(result.appointments[0]).toMatchObject({
      overlapIndex: 0,
      overlapCount: 2,
      leftPercent: 0,
      widthPercent: 50,
    });
    expect(result.appointments[1]).toMatchObject({
      overlapIndex: 1,
      overlapCount: 2,
      leftPercent: 50,
      widthPercent: 50,
    });
  });
});
