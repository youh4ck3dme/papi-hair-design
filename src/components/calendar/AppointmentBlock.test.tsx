import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentBlock, { type CalendarAppointment } from "./AppointmentBlock";

const timezoneMocks = vi.hoisted(() => ({
  getMinutesInTZ: vi.fn((date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes()),
  formatTimeInTZ: vi.fn((date: Date) => date.toISOString().slice(11, 16)),
}));

vi.mock("@/lib/timezone", () => ({
  getMinutesInTZ: timezoneMocks.getMinutesInTZ,
  formatTimeInTZ: timezoneMocks.formatTimeInTZ,
}));

function appointment(partial: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: partial.id ?? "apt-1",
    start_at: partial.start_at ?? "2026-01-15T10:00:00.000Z",
    end_at: partial.end_at ?? "2026-01-15T10:30:00.000Z",
    status: partial.status ?? "pending",
    service_name: partial.service_name ?? "Strih",
    employee_name: partial.employee_name ?? "Jana",
    customer_name: partial.customer_name ?? "Klient",
    employee_id: partial.employee_id,
    type: partial.type,
    notes: partial.notes,
  };
}

describe("AppointmentBlock", () => {
  it("renders service name", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ service_name: "Masáž" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Masáž")).toBeInTheDocument();
  });

  it("sets title with customer and service", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ customer_name: "Eva", service_name: "Farbenie" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Eva - Farbenie")).toBeInTheDocument();
  });

  it("uses pending style for pending status", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ status: "pending" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button").className).toContain("bg-gold/30");
  });

  it("uses confirmed style for confirmed status", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ status: "confirmed" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button").className).toContain("bg-emerald-500/25");
  });

  it("uses cancelled style for cancelled status", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ status: "cancelled" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button").className).toContain("bg-red-500/25");
  });

  it("uses completed style for completed status", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ status: "completed" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button").className).toContain("bg-muted/50");
  });

  it("falls back to pending style for unknown status", () => {
    render(
      <AppointmentBlock
        appointment={appointment({ status: "unknown" })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button").className).toContain("bg-gold/30");
  });

  it("hides customer when duration is under 25 minutes", () => {
    render(
      <AppointmentBlock
        appointment={appointment({
          customer_name: "Skrytý",
          start_at: "2026-01-15T10:00:00.000Z",
          end_at: "2026-01-15T10:20:00.000Z",
        })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByText("Skrytý")).not.toBeInTheDocument();
  });

  it("shows customer when duration is exactly 25 minutes", () => {
    render(
      <AppointmentBlock
        appointment={appointment({
          customer_name: "Viditeľný",
          start_at: "2026-01-15T10:00:00.000Z",
          end_at: "2026-01-15T10:25:00.000Z",
        })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Viditeľný")).toBeInTheDocument();
  });

  it("hides time range when duration is under 40 minutes", () => {
    render(
      <AppointmentBlock
        appointment={appointment({
          start_at: "2026-01-15T10:00:00.000Z",
          end_at: "2026-01-15T10:39:00.000Z",
        })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByText("10:00–10:39")).not.toBeInTheDocument();
  });

  it("shows time range when duration is exactly 40 minutes", () => {
    render(
      <AppointmentBlock
        appointment={appointment({
          start_at: "2026-01-15T10:00:00.000Z",
          end_at: "2026-01-15T10:40:00.000Z",
        })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("10:00–10:40")).toBeInTheDocument();
  });

  it("uses dragTop while dragging", () => {
    render(
      <AppointmentBlock
        appointment={appointment()}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
        isDragging
        dragTop={321}
      />,
    );

    expect(screen.getByRole("button")).toHaveStyle({ top: "321px" });
  });

  it("calls onClick with appointment when clicked and not dragging", () => {
    const onClick = vi.fn();
    const apt = appointment({ id: "clicked-apt" });
    render(
      <AppointmentBlock
        appointment={apt}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith(apt);
  });
});
