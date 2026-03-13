import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarEventCard } from "./CalendarEventCard";
import type { NormalizedCalendarEvent } from "@/lib/calendarEventUtils";

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children, className }: any) => <div data-testid="tooltip-content" className={className}>{children}</div>,
}));

function event(partial: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
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

describe("CalendarEventCard", () => {
  it("renders event time and title", () => {
    render(<CalendarEventCard event={event({ displayTitle: "Eva • Masáž", displayTimeRange: "11:00 - 12:00" })} />);
    expect(screen.getAllByText("Eva • Masáž").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("11:00 - 12:00").length).toBeGreaterThanOrEqual(2);
  });

  it("sets summary title attribute on card root", () => {
    render(<CalendarEventCard event={event({ displayTitle: "Lukáš • Strih", displayTimeRange: "8:30 - 9:00" })} />);
    expect(screen.getByTitle("8:30 - 9:00 • Lukáš • Strih")).toBeInTheDocument();
  });

  it("renders tooltip container components", () => {
    render(<CalendarEventCard event={event()} />);
    expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
  });

  it("shows employee name inside tooltip content", () => {
    render(<CalendarEventCard event={event({ employeeName: "Dominika" })} />);
    expect(screen.getByText("Dominika")).toBeInTheDocument();
  });

  it("shows display title inside tooltip content", () => {
    render(<CalendarEventCard event={event({ displayTitle: "Alex • Farbenie" })} />);
    expect(screen.getAllByText("Alex • Farbenie").length).toBeGreaterThanOrEqual(2);
  });

  it("shows display time inside tooltip content", () => {
    render(<CalendarEventCard event={event({ displayTimeRange: "14:00 - 14:45" })} />);
    expect(screen.getAllByText("14:00 - 14:45").length).toBeGreaterThanOrEqual(2);
  });

  it("uses expected CSS class on card root", () => {
    const { container } = render(<CalendarEventCard event={event()} />);
    expect(container.querySelector(".calendar-event-card")).not.toBeNull();
  });

  it("uses expected CSS class on time text", () => {
    const { container } = render(<CalendarEventCard event={event()} />);
    expect(container.querySelector(".calendar-event-time")).not.toBeNull();
  });

  it("uses expected CSS class on title text", () => {
    const { container } = render(<CalendarEventCard event={event()} />);
    expect(container.querySelector(".calendar-event-title")).not.toBeNull();
  });

  it("uses max width text class on tooltip content", () => {
    render(<CalendarEventCard event={event()} />);
    expect(screen.getByTestId("tooltip-content").className).toContain("max-w-72");
  });
});
