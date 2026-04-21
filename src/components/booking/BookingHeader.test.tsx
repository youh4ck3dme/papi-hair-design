import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { BookingHeader } from "./BookingHeader";

const changeLanguage = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: "sk",
      changeLanguage,
    },
  }),
}));

describe("BookingHeader", () => {
  const renderHeader = () =>
    render(
      <MemoryRouter>
        <BookingHeader />
      </MemoryRouter>,
    );

  it("renders the shared sticky public header", () => {
    renderHeader();
    expect(screen.getByTestId("public-sticky-header")).toBeInTheDocument();
  });

  it("renders all primary navigation buttons", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: "Domov" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Služby" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cenník" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rezervácia" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Telefón" })).toHaveAttribute("href", "tel:+421949459624");
  });

  it("does not render a theme toggle button", () => {
    renderHeader();
    expect(screen.queryByRole("button", { name: /Toggle theme/i })).not.toBeInTheDocument();
  });

  it("renders the language switch action", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /Switch language/i })).toBeInTheDocument();
  });
});
