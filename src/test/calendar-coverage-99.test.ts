import { describe, it, expect } from "vitest";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  computeDaySegments,
  isMinuteWorking,
} from "@/components/calendar/mobile/schedule";
import type {
  CalendarEvent as MobileCalendarEvent,
  DayException,
  TimeSegment,
  WorkingSchedule,
} from "@/components/calendar/mobile/types";
import { canBookSlot, isSlotBlockedByEvents } from "@/components/calendar/mobile/slotGuards";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  formatTimeRangeFromUtc,
  normalizeAppointmentEvent,
  parseApiDateToUtc,
  type RawAppointmentEvent,
} from "@/lib/calendarEventUtils";
import {
  buildAdminCalendarCsv,
  buildAdminCalendarPrintHtml,
  type AdminCalendarExportRow,
} from "@/lib/adminCalendarExport";
import {
  ADMIN_BOOKING_STATUS_BADGES,
  ADMIN_BOOKING_STATUS_LABELS,
  canAdminCancelBooking,
  canAdminCompleteBooking,
  canAdminConfirmBooking,
  canAdminMarkNoShow,
} from "@/lib/adminBookingStatus";
import {
  CALENDAR_END_HOUR,
  CALENDAR_MODES,
  CALENDAR_START_HOUR,
  HOURS,
  statusToColor,
} from "@/components/booking-calendar/calendar-types";

const MONDAY = new Date("2026-03-09T12:00:00");
const TUESDAY = new Date("2026-03-10T12:00:00");

function schedule(
  employeeId: string,
  weekday: number,
  start: string,
  end: string,
  breaks: Array<{ start: string; end: string }> = [],
): WorkingSchedule {
  return { employeeId, weekday, start, end, breaks };
}

function off(employeeId: string, date: string): DayException {
  return { employeeId, date, type: "off" };
}

function customHours(
  employeeId: string,
  date: string,
  start: string,
  end: string,
  breaks: Array<{ start: string; end: string }> = [],
): DayException {
  return { employeeId, date, type: "customHours", start, end, breaks };
}

function kinds(segments: TimeSegment[]): string[] {
  return segments.map((segment) => segment.kind);
}

describe("calendar coverage 99", () => {
  describe("computeDaySegments", () => {
    it("1 returns full non-working for day off exception", () => {
      const segments = computeDaySegments(MONDAY, "emp-1", [], [off("emp-1", "2026-03-09")]);
      expect(segments).toEqual([
        { startMinutes: DAY_START_MINUTES, endMinutes: DAY_END_MINUTES, kind: "nonWorking" },
      ]);
    });

    it("2 returns full non-working when schedule is missing", () => {
      const segments = computeDaySegments(MONDAY, "emp-1", [], []);
      expect(segments).toHaveLength(1);
      expect(segments[0].kind).toBe("nonWorking");
    });

    it("3 creates leading working and trailing non-working segments", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "18:00")],
        [],
      );
      expect(segments).toEqual([
        { startMinutes: 360, endMinutes: 480, kind: "nonWorking" },
        { startMinutes: 480, endMinutes: 1080, kind: "working" },
        { startMinutes: 1080, endMinutes: 1200, kind: "nonWorking" },
      ]);
    });

    it("4 clamps start before day boundary", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "05:00", "08:00")],
        [],
      );
      expect(segments[0]).toEqual({ startMinutes: 360, endMinutes: 480, kind: "working" });
    });

    it("5 clamps end after day boundary", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "18:00", "22:00")],
        [],
      );
      expect(segments.at(-1)).toEqual({ startMinutes: 1080, endMinutes: 1200, kind: "working" });
    });

    it("6 returns non-working when end equals start", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "10:00", "10:00")],
        [],
      );
      expect(kinds(segments)).toEqual(["nonWorking"]);
    });

    it("7 returns non-working when end is before start", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "16:00", "10:00")],
        [],
      );
      expect(kinds(segments)).toEqual(["nonWorking"]);
    });

    it("8 custom hours override base schedule", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "18:00")],
        [customHours("emp-1", "2026-03-09", "10:00", "12:00")],
      );
      expect(segments).toEqual([
        { startMinutes: 360, endMinutes: 600, kind: "nonWorking" },
        { startMinutes: 600, endMinutes: 720, kind: "working" },
        { startMinutes: 720, endMinutes: 1200, kind: "nonWorking" },
      ]);
    });

    it("9 custom hours use exception breaks instead of schedule breaks", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "18:00", [{ start: "09:00", end: "09:30" }])],
        [customHours("emp-1", "2026-03-09", "08:00", "12:00", [{ start: "10:00", end: "10:15" }])],
      );
      expect(segments).toEqual([
        { startMinutes: 360, endMinutes: 480, kind: "nonWorking" },
        { startMinutes: 480, endMinutes: 600, kind: "working" },
        { startMinutes: 600, endMinutes: 615, kind: "break" },
        { startMinutes: 615, endMinutes: 720, kind: "working" },
        { startMinutes: 720, endMinutes: 1200, kind: "nonWorking" },
      ]);
    });

    it("10 custom hours without start/end returns non-working", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "18:00")],
        [{ employeeId: "emp-1", date: "2026-03-09", type: "customHours", start: undefined, end: undefined }],
      );
      expect(kinds(segments)).toEqual(["nonWorking"]);
    });

    it("11 ignores break outside working range", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "12:00", [{ start: "05:00", end: "06:00" }])],
        [],
      );
      expect(kinds(segments)).toEqual(["nonWorking", "working", "nonWorking"]);
    });

    it("12 keeps break when it starts exactly at schedule start", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "10:00", [{ start: "08:00", end: "08:30" }])],
        [],
      );
      expect(segments[1]).toEqual({ startMinutes: 480, endMinutes: 510, kind: "break" });
    });

    it("13 handles multiple breaks in order", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "12:00", [
          { start: "09:00", end: "09:15" },
          { start: "10:30", end: "10:45" },
        ])],
        [],
      );
      expect(kinds(segments)).toEqual([
        "nonWorking",
        "working",
        "break",
        "working",
        "break",
        "working",
        "nonWorking",
      ]);
    });

    it("14 sorts unsorted breaks", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "12:00", [
          { start: "10:30", end: "10:45" },
          { start: "09:00", end: "09:15" },
        ])],
        [],
      );
      expect(segments[2]).toEqual({ startMinutes: 540, endMinutes: 555, kind: "break" });
    });

    it("15 ignores invalid break where end is before start", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "10:00", [{ start: "09:30", end: "09:00" }])],
        [],
      );
      expect(kinds(segments)).toEqual(["nonWorking", "working", "nonWorking"]);
    });

    it("16 matches schedule only for the selected employee", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [
          schedule("emp-2", 1, "08:00", "18:00"),
          schedule("emp-1", 1, "09:00", "11:00"),
        ],
        [],
      );
      expect(segments[1]).toEqual({ startMinutes: 540, endMinutes: 660, kind: "working" });
    });

    it("17 ignores exception from another employee", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "10:00")],
        [off("emp-2", "2026-03-09")],
      );
      expect(kinds(segments)).toContain("working");
    });

    it("18 ignores exception with different date", () => {
      const segments = computeDaySegments(
        MONDAY,
        "emp-1",
        [schedule("emp-1", 1, "08:00", "10:00")],
        [off("emp-1", "2026-03-10")],
      );
      expect(kinds(segments)).toContain("working");
    });
  });

  describe("isMinuteWorking", () => {
    const baseSegments: TimeSegment[] = [
      { startMinutes: 360, endMinutes: 480, kind: "nonWorking" },
      { startMinutes: 480, endMinutes: 540, kind: "working" },
      { startMinutes: 540, endMinutes: 555, kind: "break" },
      { startMinutes: 555, endMinutes: 600, kind: "working" },
      { startMinutes: 600, endMinutes: 1200, kind: "nonWorking" },
    ];

    it("19 returns true for minute inside working segment", () => {
      expect(isMinuteWorking(baseSegments, 500)).toBe(true);
    });

    it("20 returns false for minute inside break", () => {
      expect(isMinuteWorking(baseSegments, 545)).toBe(false);
    });

    it("21 returns false for minute inside non-working segment", () => {
      expect(isMinuteWorking(baseSegments, 370)).toBe(false);
    });

    it("22 returns true at working segment start boundary", () => {
      expect(isMinuteWorking(baseSegments, 480)).toBe(true);
    });

    it("23 returns false at working segment end boundary", () => {
      expect(isMinuteWorking(baseSegments, 540)).toBe(false);
    });

    it("24 returns false before first segment", () => {
      expect(isMinuteWorking(baseSegments, 100)).toBe(false);
    });

    it("25 returns false after last segment", () => {
      expect(isMinuteWorking(baseSegments, 1300)).toBe(false);
    });

    it("26 returns false when no segment matches", () => {
      expect(isMinuteWorking([], 500)).toBe(false);
    });

    it("27 returns true for late working minute", () => {
      expect(isMinuteWorking(baseSegments, 590)).toBe(true);
    });

    it("28 returns false exactly at day end", () => {
      expect(isMinuteWorking(baseSegments, 1200)).toBe(false);
    });

    it("29 returns false for minute inside trailing non-working segment", () => {
      expect(isMinuteWorking(baseSegments, 900)).toBe(false);
    });

    it("30 returns true for minute right before break", () => {
      expect(isMinuteWorking(baseSegments, 539)).toBe(true);
    });
  });

  describe("slot guards", () => {
    const blockedEvent: MobileCalendarEvent = {
      id: "block-1",
      employeeId: "emp-1",
      start: "2026-03-09T10:00:00.000Z",
      end: "2026-03-09T11:00:00.000Z",
      title: "Blocked",
      type: "blocked",
      status: "blocked",
    };

    const reservationEvent: MobileCalendarEvent = {
      id: "res-1",
      employeeId: "emp-1",
      start: "2026-03-09T10:00:00.000Z",
      end: "2026-03-09T11:00:00.000Z",
      title: "Reservation",
      type: "reservation",
      status: "confirmed",
    };

    const slotCases: Array<{ name: string; slot: string; events: MobileCalendarEvent[]; blocked: boolean }> = [
      { name: "31 before blocked range", slot: "2026-03-09T09:59:00.000Z", events: [blockedEvent], blocked: false },
      { name: "32 at blocked start", slot: "2026-03-09T10:00:00.000Z", events: [blockedEvent], blocked: true },
      { name: "33 inside blocked range", slot: "2026-03-09T10:30:00.000Z", events: [blockedEvent], blocked: true },
      { name: "34 at blocked end", slot: "2026-03-09T11:00:00.000Z", events: [blockedEvent], blocked: false },
      { name: "35 after blocked range", slot: "2026-03-09T11:01:00.000Z", events: [blockedEvent], blocked: false },
      { name: "36 reservation does not block", slot: "2026-03-09T10:30:00.000Z", events: [reservationEvent], blocked: false },
      { name: "37 mixed events still blocked", slot: "2026-03-09T10:30:00.000Z", events: [reservationEvent, blockedEvent], blocked: true },
      { name: "38 empty events list", slot: "2026-03-09T10:30:00.000Z", events: [], blocked: false },
      { name: "39 multiple blocked events first interval", slot: "2026-03-09T10:15:00.000Z", events: [blockedEvent, { ...blockedEvent, id: "block-2", start: "2026-03-09T12:00:00.000Z", end: "2026-03-09T13:00:00.000Z" }], blocked: true },
      { name: "40 multiple blocked events second interval", slot: "2026-03-09T12:15:00.000Z", events: [blockedEvent, { ...blockedEvent, id: "block-2", start: "2026-03-09T12:00:00.000Z", end: "2026-03-09T13:00:00.000Z" }], blocked: true },
      { name: "41 slot between blocked intervals", slot: "2026-03-09T11:30:00.000Z", events: [blockedEvent, { ...blockedEvent, id: "block-2", start: "2026-03-09T12:00:00.000Z", end: "2026-03-09T13:00:00.000Z" }], blocked: false },
      { name: "42 invalid blocked start/end does not block", slot: "2026-03-09T10:30:00.000Z", events: [{ ...blockedEvent, id: "bad-block", start: "invalid", end: "invalid" }], blocked: false },
      { name: "43 blocked event from another employee still blocks in pure guard", slot: "2026-03-09T10:30:00.000Z", events: [{ ...blockedEvent, employeeId: "emp-2" }], blocked: true },
      { name: "44 slot exactly at midnight outside interval", slot: "2026-03-09T00:00:00.000Z", events: [blockedEvent], blocked: false },
      { name: "45 slot far future outside interval", slot: "2026-03-11T00:00:00.000Z", events: [blockedEvent], blocked: false },
      { name: "46 overlapping blocked events still blocked", slot: "2026-03-09T10:45:00.000Z", events: [blockedEvent, { ...blockedEvent, id: "overlap", start: "2026-03-09T10:30:00.000Z", end: "2026-03-09T11:30:00.000Z" }], blocked: true },
      { name: "47 slot right before overlapping start", slot: "2026-03-09T10:29:59.999Z", events: [{ ...blockedEvent, start: "2026-03-09T10:30:00.000Z", end: "2026-03-09T11:30:00.000Z" }], blocked: false },
      { name: "48 slot right after start in overlap", slot: "2026-03-09T10:30:00.001Z", events: [{ ...blockedEvent, start: "2026-03-09T10:30:00.000Z", end: "2026-03-09T11:30:00.000Z" }], blocked: true },
    ];

    for (const caseDef of slotCases) {
      it(caseDef.name, () => {
        expect(isSlotBlockedByEvents(new Date(caseDef.slot), caseDef.events)).toBe(caseDef.blocked);
      });
    }

    const bookCases: Array<{ name: string; slotWorking: boolean; slotBlocked: boolean; expected: boolean }> = [
      { name: "49 can book when working and not blocked", slotWorking: true, slotBlocked: false, expected: true },
      { name: "50 cannot book when not working but not blocked", slotWorking: false, slotBlocked: false, expected: false },
      { name: "51 cannot book when working but blocked", slotWorking: true, slotBlocked: true, expected: false },
      { name: "52 cannot book when not working and blocked", slotWorking: false, slotBlocked: true, expected: false },
      { name: "53 deterministic repeated positive case", slotWorking: true, slotBlocked: false, expected: true },
      { name: "54 deterministic repeated negative case", slotWorking: false, slotBlocked: true, expected: false },
    ];

    for (const caseDef of bookCases) {
      it(caseDef.name, () => {
        expect(canBookSlot({ slotWorking: caseDef.slotWorking, slotBlocked: caseDef.slotBlocked })).toBe(caseDef.expected);
      });
    }
  });

  describe("calendarEventUtils", () => {
    it("55 parseApiDateToUtc keeps Z input in UTC", () => {
      expect(parseApiDateToUtc("2026-01-15T10:00:00Z").toISO()).toBe("2026-01-15T10:00:00.000Z");
    });

    it("56 parseApiDateToUtc converts explicit positive offset", () => {
      expect(parseApiDateToUtc("2026-01-15T10:00:00+01:00").toISO()).toBe("2026-01-15T09:00:00.000Z");
    });

    it("57 parseApiDateToUtc converts winter local business time", () => {
      expect(parseApiDateToUtc("2026-01-15T10:00:00", DEFAULT_BUSINESS_TIMEZONE).toISO()).toBe("2026-01-15T09:00:00.000Z");
    });

    it("58 parseApiDateToUtc converts summer local business time", () => {
      expect(parseApiDateToUtc("2026-07-15T10:00:00", DEFAULT_BUSINESS_TIMEZONE).toISO()).toBe("2026-07-15T08:00:00.000Z");
    });

    it("59 parseApiDateToUtc respects custom timezone", () => {
      expect(parseApiDateToUtc("2026-01-15T10:00:00", "America/New_York").toISO()).toBe("2026-01-15T15:00:00.000Z");
    });

    it("60 parseApiDateToUtc throws for empty input", () => {
      expect(() => parseApiDateToUtc("")).toThrow("Missing datetime input");
    });

    it("61 parseApiDateToUtc throws for invalid ISO", () => {
      expect(() => parseApiDateToUtc("not-a-date")).toThrow("Invalid ISO datetime");
    });

    it("62 explicit offset takes precedence over timezone argument", () => {
      expect(parseApiDateToUtc("2026-01-15T10:00:00+02:00", "America/New_York").toISO()).toBe("2026-01-15T08:00:00.000Z");
    });

    it("63 formatTimeRangeFromUtc returns winter local range", () => {
      expect(formatTimeRangeFromUtc("2026-01-15T08:00:00Z", "2026-01-15T09:30:00Z")).toBe("9:00 - 10:30");
    });

    it("64 formatTimeRangeFromUtc returns summer local range", () => {
      expect(formatTimeRangeFromUtc("2026-07-15T08:00:00Z", "2026-07-15T09:30:00Z")).toBe("10:00 - 11:30");
    });

    it("65 formatTimeRangeFromUtc supports cross-midnight", () => {
      expect(formatTimeRangeFromUtc("2026-01-15T22:30:00Z", "2026-01-15T23:30:00Z")).toBe("23:30 - 0:30");
    });

    const baseRaw: RawAppointmentEvent = {
      id: "apt-1",
      start_at: "2026-01-15T08:00:00Z",
      end_at: "2026-01-15T09:00:00Z",
      status: "confirmed",
      customers: { full_name: "  Jana Novakova  " },
      services: { name_sk: "  Fyzio  " },
      employees: { display_name: "  Tomas  " },
    };

    it("66 normalizeAppointmentEvent trims display names", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.clientName).toBe("Jana Novakova");
      expect(normalized.serviceName).toBe("Fyzio");
      expect(normalized.employeeName).toBe("Tomas");
    });

    it("67 normalizeAppointmentEvent falls back to default client name", () => {
      const normalized = normalizeAppointmentEvent({ ...baseRaw, customers: { full_name: "   " } });
      expect(normalized.clientName).toBe("Neznámy klient");
    });

    it("68 normalizeAppointmentEvent falls back to default service name", () => {
      const normalized = normalizeAppointmentEvent({ ...baseRaw, services: { name_sk: " " } });
      expect(normalized.serviceName).toBe("Bez názvu služby");
    });

    it("69 normalizeAppointmentEvent falls back to default employee name", () => {
      const normalized = normalizeAppointmentEvent({ ...baseRaw, employees: { display_name: "" } });
      expect(normalized.employeeName).toBe("Nepriradený zamestnanec");
    });

    it("70 normalizeAppointmentEvent builds display title", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.displayTitle).toBe("Jana Novakova • Fyzio");
    });

    it("71 normalizeAppointmentEvent keeps status", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.status).toBe("confirmed");
    });

    it("72 normalizeAppointmentEvent keeps id", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.id).toBe("apt-1");
    });

    it("73 normalizeAppointmentEvent stores raw resource reference", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.resource).toBe(baseRaw);
    });

    it("74 normalizeAppointmentEvent default timezone is business timezone", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.timezone).toBe(DEFAULT_BUSINESS_TIMEZONE);
    });

    it("75 normalizeAppointmentEvent applies timezone override for display time", () => {
      const normalized = normalizeAppointmentEvent(baseRaw, "UTC");
      expect(normalized.displayTimeRange).toBe("8:00 - 9:00");
    });

    it("76 normalizeAppointmentEvent converts start and end to Date objects", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.start instanceof Date).toBe(true);
      expect(normalized.end instanceof Date).toBe(true);
    });

    it("77 normalizeAppointmentEvent produces UTC ISO start", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.startUtc).toBe("2026-01-15T08:00:00.000Z");
    });

    it("78 normalizeAppointmentEvent produces UTC ISO end", () => {
      const normalized = normalizeAppointmentEvent(baseRaw);
      expect(normalized.endUtc).toBe("2026-01-15T09:00:00.000Z");
    });

    it("79 normalizeAppointmentEvent works when nested customer/service/employee are null", () => {
      const normalized = normalizeAppointmentEvent({
        ...baseRaw,
        customers: null,
        services: null,
        employees: null,
      });
      expect(normalized.clientName).toBe("Neznámy klient");
      expect(normalized.serviceName).toBe("Bez názvu služby");
      expect(normalized.employeeName).toBe("Nepriradený zamestnanec");
    });
  });

  describe("admin calendar export", () => {
    const row: AdminCalendarExportRow = {
      reference: "REF-001",
      customerName: "Jana Novakova",
      customerEmail: "jana@example.com",
      customerPhone: "+421900000001",
      serviceName: "Fyzio",
      employeeName: "Tomas",
      start: new Date("2026-03-09T09:00:00"),
      end: new Date("2026-03-09T09:30:00"),
      status: "Potvrdená",
      note: "Poznámka",
    };

    it("80 CSV contains expected header", () => {
      const csv = buildAdminCalendarCsv([row]);
      expect(csv.split("\n")[0]).toContain("Referencia;Klient;Email;Telefon");
    });

    it("81 CSV contains one data row plus header", () => {
      const csv = buildAdminCalendarCsv([row]);
      expect(csv.split("\n")).toHaveLength(2);
    });

    it("82 CSV escapes semicolon values", () => {
      const csv = buildAdminCalendarCsv([{ ...row, customerName: "Jana;Novakova" }]);
      expect(csv).toContain("\"Jana;Novakova\"");
    });

    it("83 CSV escapes quotes", () => {
      const csv = buildAdminCalendarCsv([{ ...row, note: "Ahoj \"svet\"" }]);
      expect(csv).toContain("\"Ahoj \"\"svet\"\"\"");
    });

    it("84 CSV escapes newline", () => {
      const csv = buildAdminCalendarCsv([{ ...row, note: "Prvá\nDruhá" }]);
      expect(csv).toContain("\"Prvá\nDruhá\"");
    });

    it("85 CSV uses empty strings for null fields", () => {
      const csv = buildAdminCalendarCsv([{ ...row, customerEmail: null, customerPhone: null, note: null }]);
      expect(csv).toContain(";;");
    });

    it("86 CSV formats datetime in yyyy-MM-dd HH:mm", () => {
      const csv = buildAdminCalendarCsv([row]);
      expect(csv).toContain("2026-03-09 09:00");
      expect(csv).toContain("2026-03-09 09:30");
    });

    it("87 print HTML contains reservation count", () => {
      const html = buildAdminCalendarPrintHtml("Pondelok", [row]);
      expect(html).toContain("Pocet rezervacii: 1");
    });

    it("88 print HTML contains date label and title", () => {
      const html = buildAdminCalendarPrintHtml("Pondelok", [row]);
      expect(html).toContain("Pondelok");
      expect(html).toContain("FYZIO&FIT - Denny prehlad");
    });

    it("89 print HTML uses placeholders for missing optional values", () => {
      const html = buildAdminCalendarPrintHtml("Pondelok", [{ ...row, serviceName: null, employeeName: null, customerEmail: null, customerPhone: null, note: null }]);
      expect(html).toContain("<td>-</td>");
    });
  });

  describe("status and calendar helpers", () => {
    it("90 calendar modes are day, week, month", () => {
      expect(CALENDAR_MODES).toEqual(["day", "week", "month"]);
    });

    it("91 hours array matches configured start and end boundaries", () => {
      expect(HOURS[0]).toBe(CALENDAR_START_HOUR);
      expect(HOURS.at(-1)).toBe(CALENDAR_END_HOUR - 1);
      expect(HOURS).toHaveLength(CALENDAR_END_HOUR - CALENDAR_START_HOUR);
    });

    it("92 statusToColor maps known status", () => {
      expect(statusToColor("confirmed")).toBe("confirmed");
    });

    it("93 statusToColor maps no_show to cancelled semantic", () => {
      expect(statusToColor("no_show")).toBe("cancelled");
    });

    it("94 statusToColor falls back to pending for unknown status", () => {
      expect(statusToColor("unknown")).toBe("pending");
    });

    it("95 admin labels include all expected status keys", () => {
      expect(Object.keys(ADMIN_BOOKING_STATUS_LABELS).sort()).toEqual([
        "cancelled",
        "completed",
        "confirmed",
        "no_show",
        "pending",
      ]);
    });

    it("96 admin badges include all expected status keys", () => {
      expect(Object.keys(ADMIN_BOOKING_STATUS_BADGES).sort()).toEqual([
        "cancelled",
        "completed",
        "confirmed",
        "no_show",
        "pending",
      ]);
    });

    it("97 admin status guard: confirm only pending", () => {
      expect(canAdminConfirmBooking("pending")).toBe(true);
      expect(canAdminConfirmBooking("confirmed")).toBe(false);
    });

    it("98 admin status guard: complete/no-show only confirmed", () => {
      expect(canAdminCompleteBooking("confirmed")).toBe(true);
      expect(canAdminCompleteBooking("pending")).toBe(false);
      expect(canAdminMarkNoShow("confirmed")).toBe(true);
      expect(canAdminMarkNoShow("cancelled")).toBe(false);
    });

    it("99 admin status guard: cancel for pending and confirmed only", () => {
      expect(canAdminCancelBooking("pending")).toBe(true);
      expect(canAdminCancelBooking("confirmed")).toBe(true);
      expect(canAdminCancelBooking("completed")).toBe(false);
      expect(canAdminCancelBooking("no_show")).toBe(false);
    });
  });

});
