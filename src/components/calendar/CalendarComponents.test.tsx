import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarViewSwitcher from "./CalendarViewSwitcher";
import GlassHeader from "./GlassHeader";
import AppointmentBlock, { type CalendarAppointment } from "./AppointmentBlock";
import WeekTimeline from "./WeekTimeline";
import MonthGrid from "./MonthGrid";
import { CalendarEventCard } from "./CalendarEventCard";
import type { NormalizedCalendarEvent } from "@/lib/calendarEventUtils";

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

function appointment(partial: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: partial.id ?? "apt-1",
    start_at: partial.start_at ?? "2026-01-15T08:00:00.000Z",
    end_at: partial.end_at ?? "2026-01-15T08:30:00.000Z",
    status: partial.status ?? "pending",
    service_name: partial.service_name ?? "Strih",
    employee_name: partial.employee_name ?? "Marek",
    customer_name: partial.customer_name ?? "Jana",
    employee_id: partial.employee_id,
    type: partial.type,
    notes: partial.notes,
  };
}

function normalizedEvent(partial: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
  return {
    id: partial.id ?? "evt-1",
    start: partial.start ?? new Date("2026-01-15T08:00:00.000Z"),
    end: partial.end ?? new Date("2026-01-15T09:00:00.000Z"),
    startUtc: partial.startUtc ?? "2026-01-15T08:00:00.000Z",
    endUtc: partial.endUtc ?? "2026-01-15T09:00:00.000Z",
    timezone: partial.timezone ?? "Europe/Bratislava",
    status: partial.status ?? "confirmed",
    color: partial.color ?? "confirmed",
    displayTitle: partial.displayTitle ?? "Jana • Strih",
    displayTimeRange: partial.displayTimeRange ?? "9:00 - 10:00",
    clientName: partial.clientName ?? "Jana",
    serviceName: partial.serviceName ?? "Strih",
    employeeName: partial.employeeName ?? "Marek",
    resource: partial.resource,
  };
}

describe("calendar components", () => {
  it("renders all three view switcher labels", () => {
    render(<CalendarViewSwitcher view="month" onViewChange={vi.fn()} />);
    expect(screen.getByText("Mesiac")).toBeInTheDocument();
    expect(screen.getByText("Týždeň")).toBeInTheDocument();
    expect(screen.getByText("Deň")).toBeInTheDocument();
  });

  it("calls onViewChange when clicking week", () => {
    const onViewChange = vi.fn();
    render(<CalendarViewSwitcher view="month" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText("Týždeň"));
    expect(onViewChange).toHaveBeenCalledWith("week");
  });

  it("calls onViewChange when clicking day", () => {
    const onViewChange = vi.fn();
    render(<CalendarViewSwitcher view="week" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText("Deň"));
    expect(onViewChange).toHaveBeenCalledWith("day");
  });

  it("glass header renders today button for non-today date", () => {
    render(
      <GlassHeader
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        view="day"
        onViewChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
      />,
    );
    expect(screen.getByText("Dnes")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("glass header hides today button for today date", () => {
    render(
      <GlassHeader
        currentDate={new Date()}
        view="day"
        onViewChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Dnes" })).not.toBeInTheDocument();
  });

  it("glass header calls prev/next/today handlers", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onToday = vi.fn();
    render(
      <GlassHeader
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        view="week"
        onViewChange={vi.fn()}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
      />,
    );

    fireEvent.click(screen.getByText("Dnes"));
    const iconButtons = screen.getAllByRole("button").filter((btn) =>
      btn.className.includes("cal-header__btn"),
    );
    fireEvent.click(iconButtons[1]);
    fireEvent.click(iconButtons[2]);

    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("appointment block computes top and minimum height", () => {
    const onClick = vi.fn();
    render(
      <AppointmentBlock
        appointment={appointment({
          start_at: "2026-01-15T08:00:00.000Z",
          end_at: "2026-01-15T08:10:00.000Z",
        })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={onClick}
      />,
    );

    const block = screen.getByRole("button");
    expect(block).toHaveStyle({ top: "128px", minHeight: "28px" });
  });

  it("appointment block calls click handler when not dragging", () => {
    const onClick = vi.fn();
    const apt = appointment({ id: "apt-click" });
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

  it("appointment block suppresses click while dragging", () => {
    const onClick = vi.fn();
    render(
      <AppointmentBlock
        appointment={appointment()}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={onClick}
        isDragging
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("appointment block renders customer and time for long enough durations", () => {
    render(
      <AppointmentBlock
        appointment={appointment({
          customer_name: "Lucia",
          start_at: "2026-01-15T08:00:00.000Z",
          end_at: "2026-01-15T09:00:00.000Z",
        })}
        hourHeight={64}
        startHour={6}
        timezone="UTC"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Lucia")).toBeInTheDocument();
    expect(screen.getByText("08:00–09:00")).toBeInTheDocument();
  });

  it("week timeline renders all week days and day badge", () => {
    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        timezone="UTC"
        onDayClick={vi.fn()}
        onTapAppointment={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(7);
  });

  it("week timeline shows appointment count and calls day click", () => {
    const onDayClick = vi.fn();
    render(
      <WeekTimeline
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[appointment({ id: "one" })]}
        timezone="UTC"
        onDayClick={onDayClick}
        onTapAppointment={vi.fn()}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  it("week timeline calls onTapAppointment when tapping appointment row", () => {
    const onTapAppointment = vi.fn();
    const apt = appointment({
      id: "tap-me",
      service_name: "Masáž",
      start_at: "2026-01-15T10:00:00.000Z",
    });

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

  it("month grid renders weekday headers", () => {
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

  it("month grid calls onDayClick when clicking day cell", () => {
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
  });

  it("month grid shows free slots and full marker", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[
          appointment({
            id: "book-1",
            start_at: "2026-01-15T09:00:00.000Z",
            end_at: "2026-01-15T09:30:00.000Z",
          }),
          appointment({
            id: "book-2",
            start_at: "2026-01-15T09:30:00.000Z",
            end_at: "2026-01-15T10:00:00.000Z",
          }),
        ]}
        onDayClick={vi.fn()}
        businessHours={[
          { day_of_week: "thursday", mode: "open", start_time: "09:00", end_time: "10:00" },
        ]}
      />,
    );

    expect(screen.getByText("plný")).toBeInTheDocument();
  });

  it("month grid marks closed day with dash", () => {
    render(
      <MonthGrid
        currentDate={new Date("2026-01-15T12:00:00.000Z")}
        appointments={[]}
        onDayClick={vi.fn()}
        businessHours={[{ day_of_week: "thursday", mode: "closed", start_time: "09:00", end_time: "10:00" }]}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calendar event card renders title and time", () => {
    const event = normalizedEvent({
      displayTitle: "Jana • Farbenie",
      displayTimeRange: "11:00 - 12:00",
    });
    render(<CalendarEventCard event={event} />);
    expect(screen.getByText("Jana • Farbenie")).toBeInTheDocument();
    expect(screen.getByText("11:00 - 12:00")).toBeInTheDocument();
  });

  it("calendar event card sets summary title attribute", () => {
    const event = normalizedEvent({
      displayTitle: "Eva • Strih",
      displayTimeRange: "8:00 - 8:30",
    });
    render(<CalendarEventCard event={event} />);
    expect(screen.getByTitle("8:00 - 8:30 • Eva • Strih")).toBeInTheDocument();
  });
});
