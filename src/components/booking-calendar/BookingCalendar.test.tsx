import { act, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BookingCalendarProvider } from "./BookingCalendarProvider";
import { useBookingCalendarContext } from "./calendar-context";
import type { BookingCalendarEvent as BookingEvent, BookingCalendarMode } from "./calendar-types";
import { CALENDAR_END_HOUR, CALENDAR_START_HOUR, HOURS } from "./calendar-types";
import { BookingCalendar } from "./BookingCalendar";
import { CalendarHeaderDate } from "./header/CalendarHeaderDate";
import { CalendarHeaderAdd } from "./header/CalendarHeaderAdd";
import { CalendarHeaderMode } from "./header/CalendarHeaderMode";
import { CalendarBody } from "./body/CalendarBody";
import { CalendarBodyDayContent } from "./body/CalendarBodyDayContent";
import { CalendarBodyMonth } from "./body/CalendarBodyMonth";
import { BookingCalendarEvent } from "./BookingCalendarEvent";
import { CalendarBodyHeader } from "./body/CalendarBodyHeader";
import { CalendarBodyMargin } from "./body/CalendarBodyMargin";

interface ProviderOpts {
  mode?: BookingCalendarMode;
  date?: Date;
  events?: BookingEvent[];
  selectable?: boolean;
  resources?: Array<{ id: string; display_name: string }>;
  businessHours?: unknown;
  onSelectSlot?: (slot: { start: Date; end: Date }) => void;
  onSelectEvent?: (event: BookingEvent) => void;
  setMode?: (mode: BookingCalendarMode) => void;
  setDate?: (date: Date) => void;
}

function makeEvent(partial: Partial<BookingEvent> = {}): BookingEvent {
  return {
    id: partial.id ?? "e-1",
    title: partial.title ?? "Rezervácia",
    start: partial.start ?? new Date(2026, 0, 15, 9, 0),
    end: partial.end ?? new Date(2026, 0, 15, 10, 0),
    color: partial.color ?? "confirmed",
    resource: partial.resource,
  };
}

function renderWithProvider(ui: ReactNode, opts: ProviderOpts = {}) {
  const setDate = (opts.setDate ?? vi.fn()) as ReturnType<typeof vi.fn>;
  const setMode = (opts.setMode ?? vi.fn()) as ReturnType<typeof vi.fn>;
  const onSelectSlot = (opts.onSelectSlot ?? vi.fn()) as ReturnType<typeof vi.fn>;
  const onSelectEvent = (opts.onSelectEvent ?? vi.fn()) as ReturnType<typeof vi.fn>;

  const date = opts.date ?? new Date(2026, 0, 15, 12, 0);
  const mode = opts.mode ?? "day";
  const events = opts.events ?? [];
  const selectable = opts.selectable ?? false;

  const view = render(
    <BookingCalendarProvider
      events={events}
      date={date}
      setDate={setDate}
      mode={mode}
      setMode={setMode}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      selectable={selectable}
      businessHours={opts.businessHours}
      resources={opts.resources}
    >
      {ui}
    </BookingCalendarProvider>,
  );

  return { ...view, setDate, setMode, onSelectSlot, onSelectEvent, date };
}

describe("booking-calendar components", () => {
  it("throws when context hook is used outside provider", () => {
    function BadConsumer() {
      useBookingCalendarContext();
      return null;
    }

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(
      "useBookingCalendarContext must be used within BookingCalendarProvider",
    );
    consoleErrorSpy.mockRestore();
  });

  it("renders three mode labels in header mode switch", () => {
    renderWithProvider(<CalendarHeaderMode />);

    expect(screen.getByText("Deň")).toBeInTheDocument();
    expect(screen.getByText("Týždeň")).toBeInTheDocument();
    expect(screen.getByText("Mesiac")).toBeInTheDocument();
  });

  it("switches mode from day to week", () => {
    const { setMode } = renderWithProvider(<CalendarHeaderMode />, { mode: "day" });
    fireEvent.click(screen.getByText("Týždeň"));
    expect(setMode).toHaveBeenCalledWith("week");
  });

  it("switches mode from week to month", () => {
    const { setMode } = renderWithProvider(<CalendarHeaderMode />, { mode: "week" });
    fireEvent.click(screen.getByText("Mesiac"));
    expect(setMode).toHaveBeenCalledWith("month");
  });

  it("moves date one day backward in day mode", () => {
    const date = new Date(2026, 0, 15, 10, 0);
    const { setDate } = renderWithProvider(<CalendarHeaderDate />, { mode: "day", date });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(setDate).toHaveBeenCalledTimes(1);
    expect((setDate.mock.calls[0][0] as Date).getDate()).toBe(14);
  });

  it("moves date one week forward in week mode", () => {
    const date = new Date(2026, 0, 15, 10, 0);
    const { setDate } = renderWithProvider(<CalendarHeaderDate />, { mode: "week", date });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

    expect(setDate).toHaveBeenCalledTimes(1);
    expect((setDate.mock.calls[0][0] as Date).getDate()).toBe(22);
  });

  it("moves date one month forward in month mode", () => {
    const date = new Date(2026, 0, 15, 10, 0);
    const { setDate } = renderWithProvider(<CalendarHeaderDate />, { mode: "month", date });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

    expect(setDate).toHaveBeenCalledTimes(1);
    expect((setDate.mock.calls[0][0] as Date).getMonth()).toBe(1);
  });

  it("hides add button when selectable is false", () => {
    renderWithProvider(<CalendarHeaderAdd />, { selectable: false });
    expect(
      screen.queryByLabelText("Pridať novú rezerváciu na vybraný deň"),
    ).not.toBeInTheDocument();
  });

  it("creates default 30 minute slot on add click", () => {
    const onSelectSlot = vi.fn();
    const date = new Date(2026, 4, 2, 18, 35);

    renderWithProvider(<CalendarHeaderAdd />, {
      selectable: true,
      onSelectSlot,
      date,
    });

    fireEvent.click(screen.getByLabelText("Pridať novú rezerváciu na vybraný deň"));
    const slot = onSelectSlot.mock.calls[0][0] as { start: Date; end: Date };

    expect(onSelectSlot).toHaveBeenCalledTimes(1);
    expect(slot.start.getHours()).toBe(CALENDAR_START_HOUR);
    expect(slot.start.getMinutes()).toBe(0);
    expect(slot.end.getHours()).toBe(CALENDAR_START_HOUR);
    expect(slot.end.getMinutes()).toBe(30);
    expect(slot.start.getDate()).toBe(2);
  });

  it("renders day body for day mode", () => {
    renderWithProvider(<CalendarBody />, { mode: "day" });
    expect(screen.getAllByText(/:00$/).length).toBeGreaterThan(0);
  });

  it("renders week body with seven day columns", () => {
    renderWithProvider(<CalendarBody />, { mode: "week" });
    expect(screen.getAllByText(/:00$/).length).toBeGreaterThan(7);
  });

  it("renders month body weekday labels", () => {
    renderWithProvider(<CalendarBody />, { mode: "month" });
    expect(screen.getByText("po")).toBeInTheDocument();
    expect(screen.getByText("ne")).toBeInTheDocument();
  });

  it("renders one selectable slot per hour in day content", () => {
    renderWithProvider(<CalendarBodyDayContent date={new Date(2026, 0, 15)} />, {
      selectable: true,
    });

    expect(screen.getAllByRole("button", { name: /Vybrať čas okolo/i })).toHaveLength(
      HOURS.length,
    );
  });

  it("handles click in top half as :00 slot", () => {
    const onSelectSlot = vi.fn();
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 100,
        height: 100,
        top: 100,
        left: 0,
        right: 100,
        bottom: 200,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);

    renderWithProvider(<CalendarBodyDayContent date={new Date(2026, 0, 15)} />, {
      selectable: true,
      onSelectSlot,
    });

    const firstHourSlot = screen.getAllByRole("button", { name: /Vybrať čas okolo/i })[0];
    fireEvent.click(firstHourSlot, { clientY: 110 });
    const slot = onSelectSlot.mock.calls[0][0] as { start: Date; end: Date };

    expect(slot.start.getHours()).toBe(CALENDAR_START_HOUR);
    expect(slot.start.getMinutes()).toBe(0);
    rectSpy.mockRestore();
  });

  it("handles click in bottom half as :30 slot", () => {
    const onSelectSlot = vi.fn();
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 100,
        height: 100,
        top: 100,
        left: 0,
        right: 100,
        bottom: 200,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);

    renderWithProvider(<CalendarBodyDayContent date={new Date(2026, 0, 15)} />, {
      selectable: true,
      onSelectSlot,
    });

    const firstHourSlot = screen.getAllByRole("button", { name: /Vybrať čas okolo/i })[0];
    fireEvent.click(firstHourSlot, { clientY: 190 });
    const slot = onSelectSlot.mock.calls[0][0] as { start: Date; end: Date };

    expect(slot.start.getHours()).toBe(CALENDAR_START_HOUR);
    expect(slot.start.getMinutes()).toBe(30);
    rectSpy.mockRestore();
  });

  it("handles Enter keyboard for slot selection", () => {
    const onSelectSlot = vi.fn();
    renderWithProvider(<CalendarBodyDayContent date={new Date(2026, 0, 15)} />, {
      selectable: true,
      onSelectSlot,
    });

    const firstHourSlot = screen.getAllByRole("button", { name: /Vybrať čas okolo/i })[0];
    fireEvent.keyDown(firstHourSlot, { key: "Enter" });
    const slot = onSelectSlot.mock.calls[0][0] as { start: Date; end: Date };

    expect(slot.start.getHours()).toBe(CALENDAR_START_HOUR);
    expect(slot.start.getMinutes()).toBe(0);
  });

  it("handles Space keyboard for slot selection", () => {
    const onSelectSlot = vi.fn();
    renderWithProvider(<CalendarBodyDayContent date={new Date(2026, 0, 15)} />, {
      selectable: true,
      onSelectSlot,
    });

    const firstHourSlot = screen.getAllByRole("button", { name: /Vybrať čas okolo/i })[0];
    fireEvent.keyDown(firstHourSlot, { key: " " });
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
  });

  it("marks slot as closed based on business hours", () => {
    const businessHours = {
      hours: [{ day_of_week: "thursday", mode: "open", start_time: "08:00", end_time: "16:00" }],
      overrides: [],
    };

    renderWithProvider(<CalendarBodyDayContent date={new Date(2026, 0, 15)} />, {
      selectable: true,
      businessHours,
    });

    expect(
      screen.getByRole("button", {
        name: `Vybrať čas okolo ${CALENDAR_START_HOUR}:00 (Zatvorené)`,
      }),
    ).toBeInTheDocument();
  });

  it("filters day events by resource id", () => {
    const date = new Date(2026, 0, 15, 12, 0);
    const events = [
      makeEvent({
        id: "event-emp-1",
        title: "Emp 1",
        start: new Date(2026, 0, 15, 9, 0),
        end: new Date(2026, 0, 15, 9, 30),
        resource: { employee_id: "emp-1" },
      }),
      makeEvent({
        id: "event-emp-2",
        title: "Emp 2",
        start: new Date(2026, 0, 15, 10, 0),
        end: new Date(2026, 0, 15, 10, 30),
        resource: { employee_id: "emp-2" },
      }),
    ];

    renderWithProvider(<CalendarBodyDayContent date={date} resourceId="emp-1" />, {
      events,
    });

    expect(screen.getByText("Emp 1")).toBeInTheDocument();
    expect(screen.queryByText("Emp 2")).not.toBeInTheDocument();
  });

  it("shows resource name in day header", () => {
    renderWithProvider(
      <CalendarBodyDayContent
        date={new Date(2026, 0, 15)}
        resourceName="Marek"
        showHeader
      />,
    );
    expect(screen.getByText("Marek")).toBeInTheDocument();
  });

  it("renders current day style in header component", () => {
    const { container } = render(<CalendarBodyHeader date={new Date()} />);
    expect(container.querySelector(".text-gold")).not.toBeNull();
  });

  it("hides date number when onlyDay is true", () => {
    render(<CalendarBodyHeader date={new Date(2026, 0, 15)} onlyDay />);
    expect(screen.queryByText("15")).not.toBeInTheDocument();
  });

  it("renders hour margin labels", () => {
    renderWithProvider(<CalendarBodyMargin />);
    expect(screen.getByText(`${CALENDAR_START_HOUR}:00`)).toBeInTheDocument();
    expect(screen.getByText(`${CALENDAR_END_HOUR - 1}:00`)).toBeInTheDocument();
  });

  it("renders booking event title and time range", () => {
    const date = new Date(2026, 0, 15, 12, 0);
    const event = makeEvent({
      title: "Farbenie",
      start: new Date(2026, 0, 15, 8, 0),
      end: new Date(2026, 0, 15, 8, 30),
    });

    renderWithProvider(<BookingCalendarEvent event={event} />, {
      events: [event],
      date,
      onSelectEvent: vi.fn(),
    });

    expect(screen.getByText("Farbenie")).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("08:30")).toBeInTheDocument();
  });

  it("selects booking event on click", () => {
    const onSelectEvent = vi.fn();
    const event = makeEvent({ title: "Klik test" });
    renderWithProvider(<BookingCalendarEvent event={event} />, {
      events: [event],
      onSelectEvent,
    });

    fireEvent.click(screen.getByText("Klik test"));
    expect(onSelectEvent).toHaveBeenCalledWith(event);
  });

  it("selects booking event on Enter key", () => {
    const onSelectEvent = vi.fn();
    const event = makeEvent({ title: "Enter test" });
    renderWithProvider(<BookingCalendarEvent event={event} />, {
      events: [event],
      onSelectEvent,
    });

    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onSelectEvent).toHaveBeenCalledWith(event);
  });

  it("does not render day event outside visible hours", () => {
    const event = makeEvent({
      title: "Mimo rozsahu",
      start: new Date(2026, 0, 15, 2, 0),
      end: new Date(2026, 0, 15, 3, 0),
    });
    const { container } = renderWithProvider(<BookingCalendarEvent event={event} />, {
      events: [event],
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders month event even when outside day visible range", () => {
    const event = makeEvent({
      title: "Month event",
      start: new Date(2026, 0, 15, 2, 0),
      end: new Date(2026, 0, 15, 3, 0),
    });

    renderWithProvider(<BookingCalendarEvent event={event} month />, { events: [event] });
    expect(screen.getByText("Month event")).toBeInTheDocument();
  });

  it("applies inline styles for hex event color", () => {
    const event = makeEvent({
      title: "Hex",
      color: "#ff0000",
    });

    renderWithProvider(<BookingCalendarEvent event={event} />, {
      events: [event],
    });
    expect(screen.getByRole("button")).toHaveStyle({ borderLeftWidth: "4px" });
  });

  it("splits overlap width between two events", () => {
    const eventA = makeEvent({
      id: "a",
      title: "A",
      start: new Date(2026, 0, 15, 9, 0),
      end: new Date(2026, 0, 15, 10, 0),
    });
    const eventB = makeEvent({
      id: "b",
      title: "B",
      start: new Date(2026, 0, 15, 9, 30),
      end: new Date(2026, 0, 15, 10, 30),
    });

    renderWithProvider(<BookingCalendarEvent event={eventA} />, {
      events: [eventA, eventB],
    });

    expect(screen.getByRole("button")).toHaveStyle({ width: "50%" });
  });

  it("month day click switches to day mode", () => {
    const setMode = vi.fn();
    const setDate = vi.fn();
    renderWithProvider(<CalendarBodyMonth />, {
      mode: "month",
      date: new Date(2026, 0, 15),
      setMode,
      setDate,
    });

    fireEvent.click(screen.getAllByRole("button", { name: "15" })[0]);
    expect(setMode).toHaveBeenCalledWith("day");
    expect(setDate).toHaveBeenCalledTimes(1);
  });

  it("month +more chip switches to day mode", () => {
    const setMode = vi.fn();
    const setDate = vi.fn();
    const date = new Date(2026, 0, 15);
    const events = [
      makeEvent({ id: "e1", start: new Date(2026, 0, 15, 8, 0), end: new Date(2026, 0, 15, 8, 30) }),
      makeEvent({ id: "e2", start: new Date(2026, 0, 15, 9, 0), end: new Date(2026, 0, 15, 9, 30) }),
      makeEvent({ id: "e3", start: new Date(2026, 0, 15, 10, 0), end: new Date(2026, 0, 15, 10, 30) }),
      makeEvent({ id: "e4", start: new Date(2026, 0, 15, 11, 0), end: new Date(2026, 0, 15, 11, 30) }),
      makeEvent({ id: "e5", start: new Date(2026, 0, 15, 12, 0), end: new Date(2026, 0, 15, 12, 30) }),
    ];

    renderWithProvider(<CalendarBodyMonth />, {
      mode: "month",
      date,
      events,
      setMode,
      setDate,
    });

    fireEvent.click(screen.getByText("+1 ďalších"));
    expect(setMode).toHaveBeenCalledWith("day");
  });

  it("renders booking calendar shell with header and body", () => {
    const { container } = render(
      <BookingCalendar
        events={[]}
        date={new Date(2026, 0, 15)}
        setDate={vi.fn()}
        mode="day"
        setMode={vi.fn()}
        selectable
      />,
    );

    expect(container.querySelector(".booking-calendar")).not.toBeNull();
    expect(container.querySelector(".booking-calendar-header")).not.toBeNull();
    expect(container.querySelector(".booking-calendar-body")).not.toBeNull();
  });

  it("supports zoom out in 10%, 20% and 30% steps", () => {
    render(
      <BookingCalendar
        events={[]}
        date={new Date(2026, 0, 15)}
        setDate={vi.fn()}
        mode="day"
        setMode={vi.fn()}
      />,
    );

    const zoomOutButton = screen.getByRole("button", { name: "Zmenšiť" });

    expect(screen.getByText("100%")).toBeInTheDocument();
    fireEvent.click(zoomOutButton);
    expect(screen.getByText("-10%")).toBeInTheDocument();
    fireEvent.click(zoomOutButton);
    expect(screen.getByText("-20%")).toBeInTheDocument();
    fireEvent.click(zoomOutButton);
    expect(screen.getByText("-30%")).toBeInTheDocument();
    expect(zoomOutButton).toBeDisabled();
  });

  it("caps zoom in at +20%", () => {
    render(
      <BookingCalendar
        events={[]}
        date={new Date(2026, 0, 15)}
        setDate={vi.fn()}
        mode="day"
        setMode={vi.fn()}
      />,
    );

    const zoomInButton = screen.getByRole("button", { name: "Zväčšiť" });

    fireEvent.click(zoomInButton);
    expect(screen.getByText("+20%")).toBeInTheDocument();
    expect(zoomInButton).toBeDisabled();
  });

  it("scales pixels per hour monotonically across all zoom levels", () => {
    function ZoomProbe() {
      const { pixelsPerHour, setZoomLevel } = useBookingCalendarContext();
      return (
        <div>
          <div data-testid="pph">{pixelsPerHour}</div>
          <button type="button" onClick={() => setZoomLevel("zoomOut30")}>z30</button>
          <button type="button" onClick={() => setZoomLevel("zoomOut20")}>z20</button>
          <button type="button" onClick={() => setZoomLevel("zoomOut10")}>z10</button>
          <button type="button" onClick={() => setZoomLevel("normal")}>zn</button>
          <button type="button" onClick={() => setZoomLevel("detail")}>zd</button>
        </div>
      );
    }

    renderWithProvider(<ZoomProbe />, { mode: "day" });

    const read = () => Number(screen.getByTestId("pph").textContent);

    fireEvent.click(screen.getByRole("button", { name: "z30" }));
    const z30 = read();
    fireEvent.click(screen.getByRole("button", { name: "z20" }));
    const z20 = read();
    fireEvent.click(screen.getByRole("button", { name: "z10" }));
    const z10 = read();
    fireEvent.click(screen.getByRole("button", { name: "zn" }));
    const zn = read();
    fireEvent.click(screen.getByRole("button", { name: "zd" }));
    const zd = read();

    expect(z30).toBeLessThan(z20);
    expect(z20).toBeLessThan(z10);
    expect(z10).toBeLessThan(zn);
    expect(zn).toBeLessThan(zd);
  });

  it("filters day events using centered calendar search", () => {
    vi.useFakeTimers();
    const date = new Date(2026, 0, 15);
    const events = [
      makeEvent({
        id: "search-1",
        title: "Anna - Farbenie",
        start: new Date(2026, 0, 15, 9, 0),
        end: new Date(2026, 0, 15, 9, 30),
        resource: { customer_name: "Anna", customer_phone: "+421111111111" },
      }),
      makeEvent({
        id: "search-2",
        title: "Mato - Strih",
        start: new Date(2026, 0, 15, 10, 0),
        end: new Date(2026, 0, 15, 10, 30),
        resource: { customer_name: "Mato", customer_phone: "+421222222222" },
      }),
    ];

    render(
      <BookingCalendar
        events={events}
        date={date}
        setDate={vi.fn()}
        mode="day"
        setMode={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Hľadať v kalendári"), {
      target: { value: "2222" },
    });

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(screen.queryByText("Anna - Farbenie")).not.toBeInTheDocument();
    expect(screen.getByText("Mato - Strih")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("switches month density to compact and shows +N more earlier", () => {
    const date = new Date(2026, 0, 15);
    const events = [
      makeEvent({ id: "m1", start: new Date(2026, 0, 15, 8, 0), end: new Date(2026, 0, 15, 8, 30) }),
      makeEvent({ id: "m2", start: new Date(2026, 0, 15, 9, 0), end: new Date(2026, 0, 15, 9, 30) }),
      makeEvent({ id: "m3", start: new Date(2026, 0, 15, 10, 0), end: new Date(2026, 0, 15, 10, 30) }),
      makeEvent({ id: "m4", start: new Date(2026, 0, 15, 11, 0), end: new Date(2026, 0, 15, 11, 30) }),
    ];

    render(
      <BookingCalendar
        events={events}
        date={date}
        setDate={vi.fn()}
        mode="month"
        setMode={vi.fn()}
      />,
    );

    expect(screen.queryByText("+2 ďalších")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(screen.getByText("+2 ďalších")).toBeInTheDocument();
  });

  it("renders resource columns in day mode when resources are present", () => {
    render(
      <BookingCalendar
        events={[]}
        date={new Date(2026, 0, 15)}
        setDate={vi.fn()}
        mode="day"
        setMode={vi.fn()}
        resources={[
          { id: "r-1", display_name: "Anna" },
          { id: "r-2", display_name: "Boris" },
        ]}
      />,
    );

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Boris")).toBeInTheDocument();
  });
});
