import { describe, expect, it } from "vitest";
import {
  buildDayExceptionsFromBusinessOverrides,
  mapAppointmentRowToCalendarAppointment,
} from "./event-mappers";
import { BLOCK_SERVICE_NAME } from "./blocking";

describe("event-mappers", () => {
  describe("mapAppointmentRowToCalendarAppointment", () => {
    it("maps reservation row to reservation appointment", () => {
      const mapped = mapAppointmentRowToCalendarAppointment({
        id: "apt-1",
        start_at: "2026-03-09T10:00:00.000Z",
        end_at: "2026-03-09T10:30:00.000Z",
        status: "confirmed",
        employee_id: "emp-1",
        notes: null,
        services: { name_sk: "Strih" },
        employees: { display_name: "Jana" },
        customers: { full_name: "Klient" },
      });

      expect(mapped.type).toBe("reservation");
      expect(mapped.service_name).toBe("Strih");
      expect(mapped.employee_name).toBe("Jana");
      expect(mapped.customer_name).toBe("Klient");
    });

    it("maps blocked note to blocked appointment with internal customer", () => {
      const mapped = mapAppointmentRowToCalendarAppointment({
        id: "apt-2",
        start_at: "2026-03-09T10:00:00.000Z",
        end_at: "2026-03-09T10:30:00.000Z",
        status: "confirmed",
        employee_id: "emp-1",
        notes: "[BLOCK] Prestávka",
        services: { name_sk: "Strih" },
        employees: { display_name: "Jana" },
        customers: { full_name: "Klient" },
      });

      expect(mapped.type).toBe("blocked");
      expect(mapped.service_name).toBe("Prestávka");
      expect(mapped.customer_name).toBe("Interné");
    });

    it("uses blocked fallback title when reason is empty", () => {
      const mapped = mapAppointmentRowToCalendarAppointment({
        id: "apt-3",
        start_at: "2026-03-09T10:00:00.000Z",
        end_at: "2026-03-09T10:30:00.000Z",
        status: "confirmed",
        employee_id: null,
        notes: "[BLOCK]   ",
        services: null,
        employees: null,
        customers: null,
      });

      expect(mapped.service_name).toBe(BLOCK_SERVICE_NAME);
      expect(mapped.employee_name).toBe("–");
      expect(mapped.customer_name).toBe("Interné");
    });
  });

  describe("buildDayExceptionsFromBusinessOverrides", () => {
    it("creates off exception for each employee when mode is closed", () => {
      const out = buildDayExceptionsFromBusinessOverrides(
        [{ override_date: "2026-03-09", mode: "closed", start_time: null, end_time: null }],
        ["emp-1", "emp-2"],
      );

      expect(out).toEqual([
        { employeeId: "emp-1", date: "2026-03-09", type: "off" },
        { employeeId: "emp-2", date: "2026-03-09", type: "off" },
      ]);
    });

    it("creates customHours exception for open mode with valid time range", () => {
      const out = buildDayExceptionsFromBusinessOverrides(
        [{ override_date: "2026-03-10", mode: "open", start_time: "09:00", end_time: "12:00" }],
        ["emp-1"],
      );

      expect(out).toEqual([
        {
          employeeId: "emp-1",
          date: "2026-03-10",
          type: "customHours",
          start: "09:00",
          end: "12:00",
          breaks: [],
        },
      ]);
    });

    it("ignores open mode when start or end time is missing", () => {
      const out = buildDayExceptionsFromBusinessOverrides(
        [
          { override_date: "2026-03-10", mode: "open", start_time: null, end_time: "12:00" },
          { override_date: "2026-03-11", mode: "open", start_time: "09:00", end_time: null },
        ],
        ["emp-1"],
      );

      expect(out).toEqual([]);
    });

    it("ignores on_request mode", () => {
      const out = buildDayExceptionsFromBusinessOverrides(
        [{ override_date: "2026-03-12", mode: "on_request", start_time: "09:00", end_time: "12:00" }],
        ["emp-1"],
      );

      expect(out).toEqual([]);
    });

    it("returns empty array when there are no employees", () => {
      const out = buildDayExceptionsFromBusinessOverrides(
        [{ override_date: "2026-03-12", mode: "closed", start_time: null, end_time: null }],
        [],
      );

      expect(out).toEqual([]);
    });
  });
});
