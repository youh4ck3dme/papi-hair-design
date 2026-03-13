import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MonthGrid from "./MonthGrid";
import type { CalendarAppointment } from "./AppointmentBlock";

function appointment(partial: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: partial.id ?? "apt-1",
    start_at: partial.start_at ?? "2026-01-15T09:00:00.000Z",
    end_at: partial.end_at ?? "2026-01-15T09:30:00.000Z",
    status: partial.status ?? "confirmed",
    service_name: partial.service_name ?? "Strih",
    employee_name: partial.employee_name ?? "Jana",
    customer_name: partial.customer_name ?? "Klient",
    employee_id: partial.employee_id,
    type: partial.type,
    notes: partial.notes,
  };
}

describe("MonthGrid", () => {
  it("renders weekday headers", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        onDayClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Po")).toBeInTheDocument();
    expect(screen.getByText("Ne")).toBeInTheDocument();
  });

  it("calls onDayClick when day cell is clicked", () => {
    const onDayClick = vi.fn();
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        onDayClick={onDayClick}
      />,
    );

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it("shows closed-day dash when business day mode is closed", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        onDayClick={vi.fn()}
        businessHours={[
          { day_of_week: "thursday", mode: "closed", start_time: "09:00", end_time: "12:00" },
        ]}
      />,
    );

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("uses business hours fallback when schedules are missing", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        onDayClick={vi.fn()}
        businessHours={[
          { day_of_week: "thursday", mode: "open", start_time: "09:00", end_time: "11:00" },
        ]}
      />,
    );

    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });

  it("uses employee schedules instead of business hours fallback", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[
          appointment({ id: "b1", start_at: "2026-01-15T09:00:00.000Z" }),
          appointment({ id: "b2", start_at: "2026-01-15T09:30:00.000Z" }),
        ]}
        onDayClick={vi.fn()}
        businessHours={[
          { day_of_week: "thursday", mode: "open", start_time: "09:00", end_time: "11:00" },
        ]}
        schedules={[
          { employee_id: "emp-1", day_of_week: "thursday", start_time: "09:00", end_time: "10:00" },
        ]}
      />,
    );

    expect(screen.getByText("plný")).toBeInTheDocument();
  });

  it("clamps free slots to zero when bookings exceed capacity", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[
          appointment({ id: "x1", start_at: "2026-01-15T09:00:00.000Z" }),
          appointment({ id: "x2", start_at: "2026-01-15T09:30:00.000Z" }),
          appointment({ id: "x3", start_at: "2026-01-15T10:00:00.000Z" }),
        ]}
        onDayClick={vi.fn()}
        businessHours={[
          { day_of_week: "thursday", mode: "open", start_time: "09:00", end_time: "10:00" },
        ]}
      />,
    );

    expect(screen.getByText("plný")).toBeInTheDocument();
  });
});
