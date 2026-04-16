import { describe, expect, it } from "vitest";
import {
  fromCalendarWallClockDateToUtcIso,
  formatTimeRangeFromUtc,
  getBusinessDayUtcRange,
  normalizeAppointmentEvent,
  parseApiDateToUtc,
  toCalendarWallClockDate,
} from "@/lib/calendarEventUtils";

describe("calendarEventUtils", () => {
  it("parses ISO with explicit UTC offset", () => {
    const parsed = parseApiDateToUtc("2025-03-10T09:00:00Z");
    expect(parsed.toISO()).toBe("2025-03-10T09:00:00.000Z");
  });

  it("parses ISO without offset in Europe/Bratislava timezone", () => {
    const parsed = parseApiDateToUtc("2025-03-10T09:00:00", "Europe/Bratislava");
    expect(parsed.toISO()).toBe("2025-03-10T08:00:00.000Z");
  });

  it("formats range in timezone with DST", () => {
    const beforeDst = formatTimeRangeFromUtc("2025-03-29T08:00:00Z", "2025-03-29T08:25:00Z", "Europe/Bratislava");
    const afterDst = formatTimeRangeFromUtc("2025-03-31T08:00:00Z", "2025-03-31T08:25:00Z", "Europe/Bratislava");

    expect(beforeDst).toBe("9:00 - 9:25");
    expect(afterDst).toBe("10:00 - 10:25");
  });

  it("normalizes fallbacks without placeholder question marks", () => {
    const normalized = normalizeAppointmentEvent({
      id: "a1",
      start_at: "2025-03-10T09:00:00Z",
      end_at: "2025-03-10T09:25:00Z",
      status: "confirmed",
      customers: null,
      services: null,
      employees: null,
    });

    expect(normalized.displayTitle).toBe("Neznámy klient • Bez názvu služby");
    expect(normalized.employeeName).toBe("Nepriradený zamestnanec");
    expect(normalized.displayTimeRange).toBe("10:00 - 10:25");
  });

  it("converts stored UTC ISO to a stable business wall-clock date", () => {
    const localDate = toCalendarWallClockDate("2026-01-15T11:00:00.000Z", "Europe/Bratislava");

    expect(localDate.getFullYear()).toBe(2026);
    expect(localDate.getMonth()).toBe(0);
    expect(localDate.getDate()).toBe(15);
    expect(localDate.getHours()).toBe(12);
    expect(localDate.getMinutes()).toBe(0);
  });

  it("serializes a wall-clock date back to UTC in the business timezone", () => {
    const selectedSlot = new Date(2026, 0, 15, 12, 0, 0, 0);

    expect(fromCalendarWallClockDateToUtcIso(selectedSlot, "Europe/Bratislava")).toBe(
      "2026-01-15T11:00:00.000Z",
    );
  });

  it("computes UTC day boundaries for the business timezone", () => {
    const range = getBusinessDayUtcRange(new Date(2026, 0, 15, 12, 0, 0, 0), "Europe/Bratislava");

    expect(range).toEqual({
      startUtc: "2026-01-14T23:00:00.000Z",
      endUtc: "2026-01-15T23:00:00.000Z",
    });
  });
});
