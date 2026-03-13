import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WeekTimeline from "./WeekTimeline";
import type { CalendarAppointment } from "./AppointmentBlock";

const timezoneMocks = vi.hoisted(() => ({
  getTimeInTZ: vi.fn((date: Date) => ({
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
  })),
  formatTimeInTZ: vi.fn(() => "10:00"),
}));

vi.mock("@/lib/timezone", () => ({
  getTimeInTZ: timezoneMocks.getTimeInTZ,
  formatTimeInTZ: timezoneMocks.formatTimeInTZ,
}));

function appointment(partial: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: partial.id ?? "apt-1",
    start_at: partial.start_at ?? "2026-01-15T10:00:00.000Z",
    end_at: partial.end_at ?? "2026-01-15T10:30:00.000Z",
    status: partial.status ?? "confirmed",
    service_name: partial.service_name ?? "Strih",
    employee_name: partial.employee_name ?? "Jana",
    customer_name: partial.customer_name ?? "Klient",
    employee_id: partial.employee_id,
    type: partial.type,
    notes: partial.notes,
  };
}

describe("WeekTimeline", () => {
  it("renders seven day header buttons for current week", () => {
    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        timezone="UTC"
        onDayClick={vi.fn()}
        onTapAppointment={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(7);
  });

  it("calls onDayClick when a day header is clicked", () => {
    const onDayClick = vi.fn();
    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        timezone="UTC"
        onDayClick={onDayClick}
        onTapAppointment={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it("shows per-day appointment count badges", () => {
    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[
          appointment({ id: "a1", start_at: "2026-01-15T09:00:00.000Z" }),
          appointment({ id: "a2", start_at: "2026-01-15T11:00:00.000Z" }),
          appointment({ id: "a3", start_at: "2026-01-16T09:00:00.000Z" }),
        ]}
        timezone="UTC"
        onDayClick={vi.fn()}
        onTapAppointment={vi.fn()}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onTapAppointment with clicked appointment", () => {
    const onTapAppointment = vi.fn();
    const apt = appointment({ id: "tap-1", service_name: "Masáž" });

    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[apt]}
        timezone="UTC"
        onDayClick={vi.fn()}
        onTapAppointment={onTapAppointment}
      />,
    );

    fireEvent.click(screen.getByTitle("Masáž"));
    expect(onTapAppointment).toHaveBeenCalledWith(apt);
  });

  it("passes timezone through getTimeInTZ and formatTimeInTZ", () => {
    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[appointment({ id: "tz-1" })]}
        timezone="Europe/Bratislava"
        onDayClick={vi.fn()}
        onTapAppointment={vi.fn()}
      />,
    );

    expect(timezoneMocks.getTimeInTZ).toHaveBeenCalledWith(expect.any(Date), "Europe/Bratislava");
    expect(timezoneMocks.formatTimeInTZ).toHaveBeenCalledWith(expect.any(Date), "Europe/Bratislava");
  });
});
