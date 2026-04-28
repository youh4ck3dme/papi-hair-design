import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MySchedulePage from "../MySchedulePage";

const calendarPageSpy = vi.hoisted(() => ({
  props: null as any,
}));

vi.mock("../CalendarPage", () => ({
  default: (props: any) => {
    calendarPageSpy.props = props;
    return <div data-testid="employee-calendar-shell" />;
  },
}));

describe("MySchedulePage", () => {
  it("uses the shared booking calendar shell in employee scope", () => {
    render(<MySchedulePage />);

    expect(screen.getByTestId("employee-calendar-shell")).toBeInTheDocument();
    expect(calendarPageSpy.props).toEqual({ scope: "employee" });
  });
});
