import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BookingHeader } from "./BookingHeader";

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button type="button" data-testid="language-toggle">SK</button>,
}));

vi.mock("@/components/booking/BookingUI", () => ({
  GoldText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function renderBookingHeader(isDark = false, setTheme = vi.fn()) {
  return render(
    <MemoryRouter>
      <BookingHeader isDark={isDark} setTheme={setTheme} />
    </MemoryRouter>,
  );
}

describe("BookingHeader", () => {
  it("renders the salon logo image", () => {
    renderBookingHeader(false, vi.fn());
    const logo = screen.getByAltText("PAPI HAIR DESIGN");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/favicon.png");
  });

  it("renders salon name text", () => {
    renderBookingHeader(false, vi.fn());
    expect(screen.getByText(/PAPI/)).toBeInTheDocument();
    expect(screen.getByText(/DESIGN/)).toBeInTheDocument();
  });

  it("renders language toggle", () => {
    renderBookingHeader(false, vi.fn());
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("calls setTheme with dark when isDark=false and theme button clicked", () => {
    const setTheme = vi.fn();
    renderBookingHeader(false, setTheme);
    const themeBtn = screen.getByRole("button", { name: /Toggle theme/i });
    fireEvent.click(themeBtn);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme with light when isDark=true and theme button clicked", () => {
    const setTheme = vi.fn();
    renderBookingHeader(true, setTheme);
    const themeBtn = screen.getByRole("button", { name: /Toggle theme/i });
    fireEvent.click(themeBtn);
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
