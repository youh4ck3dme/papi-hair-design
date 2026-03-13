import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CalendarToolbar from "./CalendarToolbar";

describe("CalendarToolbar", () => {
  it("renders all primary action buttons", () => {
    render(
      <CalendarToolbar
        view="day"
        onViewChange={vi.fn()}
        onAddReservation={vi.fn()}
        onBlockTime={vi.fn()}
        onRefresh={vi.fn()}
        onToday={vi.fn()}
        refreshing={false}
      />,
    );

    expect(screen.getByRole("button", { name: /\+ Pridať rezerváciu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Blokovať čas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Obnoviť/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dnes/i })).toBeInTheDocument();
  });

  it("calls add reservation callback", () => {
    const onAddReservation = vi.fn();

    render(
      <CalendarToolbar
        view="day"
        onViewChange={vi.fn()}
        onAddReservation={onAddReservation}
        onBlockTime={vi.fn()}
        onRefresh={vi.fn()}
        onToday={vi.fn()}
        refreshing={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Pridať rezerváciu/i }));
    expect(onAddReservation).toHaveBeenCalledTimes(1);
  });

  it("calls block time callback", () => {
    const onBlockTime = vi.fn();

    render(
      <CalendarToolbar
        view="day"
        onViewChange={vi.fn()}
        onAddReservation={vi.fn()}
        onBlockTime={onBlockTime}
        onRefresh={vi.fn()}
        onToday={vi.fn()}
        refreshing={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Blokovať čas/i }));
    expect(onBlockTime).toHaveBeenCalledTimes(1);
  });

  it("calls refresh callback when enabled", () => {
    const onRefresh = vi.fn();

    render(
      <CalendarToolbar
        view="day"
        onViewChange={vi.fn()}
        onAddReservation={vi.fn()}
        onBlockTime={vi.fn()}
        onRefresh={onRefresh}
        onToday={vi.fn()}
        refreshing={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Obnoviť/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables refresh button and applies spinning icon class while refreshing", () => {
    const { container } = render(
      <CalendarToolbar
        view="day"
        onViewChange={vi.fn()}
        onAddReservation={vi.fn()}
        onBlockTime={vi.fn()}
        onRefresh={vi.fn()}
        onToday={vi.fn()}
        refreshing
      />,
    );

    const refreshButton = screen.getByRole("button", { name: /Obnoviť/i });
    expect(refreshButton).toBeDisabled();
    const icon = container.querySelector("svg.animate-spin");
    expect(icon).toBeInTheDocument();
  });

  it("calls today callback", () => {
    const onToday = vi.fn();

    render(
      <CalendarToolbar
        view="week"
        onViewChange={vi.fn()}
        onAddReservation={vi.fn()}
        onBlockTime={vi.fn()}
        onRefresh={vi.fn()}
        onToday={onToday}
        refreshing={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Dnes/i }));
    expect(onToday).toHaveBeenCalledTimes(1);
  });

  it("changes calendar view using embedded switcher", () => {
    const onViewChange = vi.fn();

    render(
      <CalendarToolbar
        view="day"
        onViewChange={onViewChange}
        onAddReservation={vi.fn()}
        onBlockTime={vi.fn()}
        onRefresh={vi.fn()}
        onToday={vi.fn()}
        refreshing={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Týždeň/i }));
    expect(onViewChange).toHaveBeenCalledWith("week");
  });
});
