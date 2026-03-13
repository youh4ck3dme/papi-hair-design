import { render } from "@testing-library/react";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import DayTimeline from "./DayTimeline";
import type { CalendarAppointment } from "./AppointmentBlock";

function appointment(partial: Partial<CalendarAppointment> = {}): CalendarAppointment {
  return {
    id: partial.id ?? "apt-1",
    start_at: partial.start_at ?? "2026-01-15T09:00:00.000Z",
    end_at: partial.end_at ?? "2026-01-15T09:30:00.000Z",
    status: partial.status ?? "confirmed",
    service_name: partial.service_name ?? "Strih",
    employee_name: partial.employee_name ?? "Marek",
    customer_name: partial.customer_name ?? "Jana",
    employee_id: partial.employee_id,
    type: partial.type,
    notes: partial.notes,
  };
}

function setup(props: Partial<ComponentProps<typeof DayTimeline>> = {}) {
  const onTapSlot = props.onTapSlot ?? vi.fn();
  const onTapAppointment = props.onTapAppointment ?? vi.fn();
  const onMoveAppointment = props.onMoveAppointment ?? vi.fn();
  const date = props.date ?? new Date("2026-01-15T12:00:00.000Z");
  const timezone = props.timezone ?? "UTC";
  const appointments = props.appointments ?? [];

  const view = render(
    <DayTimeline
      date={date}
      appointments={appointments}
      timezone={timezone}
      onTapSlot={onTapSlot}
      onTapAppointment={onTapAppointment}
      onMoveAppointment={onMoveAppointment}
    />,
  );

  const scroller = view.container.querySelector(".cal-timeline") as HTMLDivElement;
  const grid = view.container.querySelector(".cal-timeline .relative") as HTMLDivElement;

  vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({
    width: 500,
    height: 768,
    top: 0,
    left: 0,
    right: 500,
    bottom: 768,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  vi.spyOn(scroller, "scrollTo").mockImplementation(() => {});

  return { ...view, onTapSlot, onTapAppointment, onMoveAppointment, grid, scroller, date };
}

describe("DayTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:30:00.000Z"));
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders hour labels from 08:00 to 19:00", () => {
    setup();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("19:00")).toBeInTheDocument();
  });

  it("renders appointment block title text", () => {
    setup({ appointments: [appointment({ service_name: "Farbenie" })] });
    expect(screen.getByText("Farbenie")).toBeInTheDocument();
  });

  it("shows now line when selected date is today and time is in range", () => {
    const { container } = setup({
      date: new Date("2026-01-15T12:00:00.000Z"),
    });
    expect(container.querySelectorAll(".bg-red-500").length).toBeGreaterThan(0);
  });

  it("hides now line when selected date is not today", () => {
    const { container } = setup({
      date: new Date("2026-01-16T12:00:00.000Z"),
    });
    expect(container.querySelectorAll(".bg-red-500").length).toBe(0);
  });

  it("snaps grid click to 15-minute slot and calls onTapSlot", () => {
    const { onTapSlot, grid } = setup();
    fireEvent.click(grid, { clientY: 32 }); // 08:30
    const slot = onTapSlot.mock.calls[0][0] as Date;
    expect(onTapSlot).toHaveBeenCalledTimes(1);
    expect(slot.getHours()).toBe(8);
    expect(slot.getMinutes()).toBe(30);
  });

  it("does not call onTapSlot when clicking appointment block", () => {
    const { onTapSlot } = setup({
      appointments: [appointment({ id: "apt-click", service_name: "Klik" })],
    });
    fireEvent.click(screen.getByText("Klik"));
    expect(onTapSlot).not.toHaveBeenCalled();
  });

  it("does not call onTapSlot when clicked at 20:00 boundary", () => {
    const { onTapSlot, grid } = setup();
    fireEvent.click(grid, { clientY: 768 }); // 20:00
    expect(onTapSlot).not.toHaveBeenCalled();
  });

  it("calls appointment tap handler through AppointmentBlock", () => {
    const onTapAppointment = vi.fn();
    const apt = appointment({ id: "apt-open", service_name: "Open me" });
    setup({ appointments: [apt], onTapAppointment });
    fireEvent.click(screen.getByText("Open me"));
    expect(onTapAppointment).toHaveBeenCalledWith(apt);
  });

  it("cancels long-press drag when pointer moves too much before activation", () => {
    const onMoveAppointment = vi.fn();
    const { container, grid } = setup({
      appointments: [appointment({ id: "drag-2" })],
      onMoveAppointment,
    });
    const apt = container.querySelector('[data-apt-id="drag-2"]') as HTMLElement;

    fireEvent.pointerDown(apt, { clientX: 20, clientY: 120, pointerId: 2 });
    fireEvent.pointerMove(grid, { clientX: 40, clientY: 140, pointerId: 2 }); // > 10px
    fireEvent.pointerCancel(grid, { pointerId: 2 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(grid, { clientX: 40, clientY: 140, pointerId: 2 });

    expect(onMoveAppointment).not.toHaveBeenCalled();
  });

  it("allows slot tap after pointer cancel", () => {
    const onTapSlot = vi.fn();
    const { container, grid } = setup({
      appointments: [appointment({ id: "drag-cancel" })],
      onTapSlot,
      onMoveAppointment: vi.fn(),
    });
    const apt = container.querySelector('[data-apt-id="drag-cancel"]') as HTMLElement;

    fireEvent.pointerDown(apt, { clientX: 20, clientY: 120, pointerId: 7 });
    fireEvent.pointerCancel(grid, { pointerId: 7 });
    fireEvent.click(grid, { clientY: 180 });

    expect(onTapSlot).toHaveBeenCalledTimes(1);
  });
});
