import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CalendarGrid from "./CalendarGrid";
import type { CalendarEvent, DayException, Employee, TimeSegment, WorkingSchedule } from "./types";

const employeeColumnSpy = vi.hoisted(() => ({
  calls: [] as Array<any>,
}));

const computeDaySegmentsMock = vi.hoisted(() => vi.fn());

vi.mock("./EmployeeColumn", () => ({
  default: (props: any) => {
    employeeColumnSpy.calls.push(props);
    return <div data-testid={`employee-column-${props.employee.id}`}>{props.employee.name}</div>;
  },
}));

vi.mock("./schedule", async () => {
  const actual = await vi.importActual("./schedule");
  return {
    ...actual,
    computeDaySegments: computeDaySegmentsMock,
  };
});

function makeEmployee(id: string, name: string): Employee {
  return {
    id,
    name,
    color: "#22c55e",
    isActive: true,
    orderIndex: 0,
  };
}

function makeEvent(partial: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: partial.id ?? "evt-1",
    employeeId: partial.employeeId ?? "emp-1",
    start: partial.start ?? "2026-01-15T09:00:00.000Z",
    end: partial.end ?? "2026-01-15T09:30:00.000Z",
    title: partial.title ?? "Strih",
    clientName: partial.clientName ?? "Jana",
    serviceName: partial.serviceName ?? "Strih",
    type: partial.type ?? "reservation",
    status: partial.status ?? "confirmed",
  };
}

const schedules: WorkingSchedule[] = [
  { employeeId: "emp-1", weekday: 4, start: "08:00", end: "16:00", breaks: [] },
];
const dayExceptions: DayException[] = [];

describe("CalendarGrid", () => {
  const originalScrollTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTop");
  const scrollTopSetter = vi.fn();

  beforeEach(() => {
    employeeColumnSpy.calls = [];
    computeDaySegmentsMock.mockReset();
    computeDaySegmentsMock.mockReturnValue([
      { startMinutes: 360, endMinutes: 1200, kind: "working" } as TimeSegment,
    ]);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get: () => 0,
      set: scrollTopSetter,
    });
    scrollTopSetter.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalScrollTop) {
      Object.defineProperty(HTMLElement.prototype, "scrollTop", originalScrollTop);
    }
  });

  it("shows empty-state message when no employee is selected", () => {
    render(
      <CalendarGrid
        date={new Date("2026-01-15T09:00:00.000Z")}
        employees={[makeEmployee("emp-1", "Marek")]}
        selectedEmployeeIds={[]}
        events={[]}
        schedules={schedules}
        dayExceptions={dayExceptions}
        timezone="Europe/Bratislava"
        onSlotClick={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Vyberte aspoň jedného pracovníka.")).toBeInTheDocument();
    expect(employeeColumnSpy.calls).toHaveLength(0);
  });

  it("renders selected employees in one row when count is up to three", () => {
    render(
      <CalendarGrid
        date={new Date("2026-01-15T09:00:00.000Z")}
        employees={[
          makeEmployee("emp-1", "Marek"),
          makeEmployee("emp-2", "Lucia"),
          makeEmployee("emp-3", "Eva"),
        ]}
        selectedEmployeeIds={["emp-1", "emp-2"]}
        events={[makeEvent({ id: "e-1", employeeId: "emp-2" })]}
        schedules={schedules}
        dayExceptions={dayExceptions}
        timezone="Europe/Bratislava"
        onSlotClick={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("employee-column-emp-1")).toBeInTheDocument();
    expect(screen.getByTestId("employee-column-emp-2")).toBeInTheDocument();
    expect(screen.queryByTestId("employee-column-emp-3")).not.toBeInTheDocument();
    expect(screen.getAllByText("06:00")).toHaveLength(1);
  });

  it("splits selected employees into two-column rows when there are more than three", () => {
    render(
      <CalendarGrid
        date={new Date("2026-01-15T09:00:00.000Z")}
        employees={[
          makeEmployee("emp-1", "Marek"),
          makeEmployee("emp-2", "Lucia"),
          makeEmployee("emp-3", "Eva"),
          makeEmployee("emp-4", "Adam"),
          makeEmployee("emp-5", "Nina"),
        ]}
        selectedEmployeeIds={["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"]}
        events={[]}
        schedules={schedules}
        dayExceptions={dayExceptions}
        timezone="Europe/Bratislava"
        onSlotClick={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );

    expect(employeeColumnSpy.calls).toHaveLength(5);
    expect(screen.getAllByText("06:00")).toHaveLength(3);
  });

  it("passes per-employee events and computed segments into employee columns", () => {
    const onSlotClick = vi.fn();
    const onEventClick = vi.fn();

    render(
      <CalendarGrid
        date={new Date("2026-01-15T09:00:00.000Z")}
        employees={[makeEmployee("emp-1", "Marek"), makeEmployee("emp-2", "Lucia")]}
        selectedEmployeeIds={["emp-1", "emp-2"]}
        events={[
          makeEvent({ id: "e-1", employeeId: "emp-1" }),
          makeEvent({ id: "e-2", employeeId: "emp-2" }),
        ]}
        schedules={schedules}
        dayExceptions={dayExceptions}
        timezone="Europe/Bratislava"
        onSlotClick={onSlotClick}
        onEventClick={onEventClick}
      />,
    );

    expect(computeDaySegmentsMock).toHaveBeenCalledTimes(2);
    expect(employeeColumnSpy.calls[0].events).toHaveLength(1);
    expect(employeeColumnSpy.calls[0].events[0].employeeId).toBe("emp-1");
    expect(employeeColumnSpy.calls[1].events).toHaveLength(1);
    expect(employeeColumnSpy.calls[1].events[0].employeeId).toBe("emp-2");
    expect(employeeColumnSpy.calls[0].onSlotClick).toBe(onSlotClick);
    expect(employeeColumnSpy.calls[0].onEventClick).toBe(onEventClick);
  });

  it("resets scroll position to top when rendered day is not today", () => {
    render(
      <CalendarGrid
        date={new Date("2026-01-14T09:00:00.000Z")}
        employees={[makeEmployee("emp-1", "Marek")]}
        selectedEmployeeIds={["emp-1"]}
        events={[]}
        schedules={schedules}
        dayExceptions={dayExceptions}
        timezone="Europe/Bratislava"
        onSlotClick={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );

    expect(scrollTopSetter).toHaveBeenCalledWith(0);
  });

  it("auto-scrolls near current time for today", () => {
    render(
      <CalendarGrid
        date={new Date("2026-01-15T09:00:00.000Z")}
        employees={[makeEmployee("emp-1", "Marek")]}
        selectedEmployeeIds={["emp-1"]}
        events={[]}
        schedules={schedules}
        dayExceptions={dayExceptions}
        timezone="Europe/Bratislava"
        onSlotClick={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );

    const calls = scrollTopSetter.mock.calls.map((call) => call[0]);
    expect(calls.some((value) => typeof value === "number" && value > 0)).toBe(true);
  });
});
