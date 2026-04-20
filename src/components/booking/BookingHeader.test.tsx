import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BookingHeader } from "./BookingHeader";

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button type="button" data-testid="language-toggle">SK</button>,
}));

vi.mock("@/components/booking/BookingUI", () => ({
  GoldText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("BookingHeader", () => {
  const renderHeader = () =>
    render(
      <MemoryRouter>
        <BookingHeader />
      </MemoryRouter>,
    );

  it("renders the salon logo image", () => {
    renderHeader();
    const logo = screen.getByAltText("PAPI HAIR DESIGN");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/favicon-32x32.png");
  });

  it("renders salon name text", () => {
    renderHeader();
    expect(screen.getByText(/PAPI/)).toBeInTheDocument();
    expect(screen.getByText(/DESIGN/)).toBeInTheDocument();
  });

  it("renders language toggle", () => {
    renderHeader();
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("does not render a theme toggle button", () => {
    renderHeader();
    expect(screen.queryByRole("button", { name: /Toggle theme/i })).not.toBeInTheDocument();
  });
});
