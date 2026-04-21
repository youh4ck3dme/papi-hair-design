import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicStickyHeader } from "./PublicStickyHeader";

let currentLanguage = "sk";
const changeLanguage = vi.fn((nextLanguage: string) => {
  currentLanguage = nextLanguage;
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      get language() {
        return currentLanguage;
      },
      changeLanguage,
    },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

describe("PublicStickyHeader", () => {
  beforeEach(() => {
    currentLanguage = "sk";
    changeLanguage.mockClear();
    localStorage.clear();
  });

  function renderHeader(initialPath = "/auth", onPriceAction?: () => void) {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <PublicStickyHeader onPriceAction={onPriceAction} />
        <LocationProbe />
      </MemoryRouter>,
    );
  }

  it("navigates to the home route from the home button", () => {
    renderHeader("/auth");

    fireEvent.click(screen.getByRole("button", { name: "Domov" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent("/");
  });

  it("navigates to booking from the services button", () => {
    renderHeader("/privacy");

    fireEvent.click(screen.getByRole("button", { name: "Služby" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent("/booking");
  });

  it("uses the custom pricing action when one is provided", () => {
    const onPriceAction = vi.fn();
    renderHeader("/", onPriceAction);

    fireEvent.click(screen.getByRole("button", { name: "Cenník" }));

    expect(onPriceAction).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/");
  });

  it("navigates to pricing when no custom pricing action is provided", () => {
    renderHeader("/auth");

    fireEvent.click(screen.getByRole("button", { name: "Cenník" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent("/pricing");
  });

  it("navigates to my account from the account button", () => {
    renderHeader("/privacy");

    fireEvent.click(screen.getByRole("button", { name: "Môj účet" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent("/my-account");
  });

  it("renders the phone action as a tel link", () => {
    renderHeader("/booking");

    expect(screen.getByRole("link", { name: "Telefón" })).toHaveAttribute("href", "tel:+421949459624");
  });

  it("toggles language and persists the selection", () => {
    renderHeader("/booking");

    fireEvent.click(screen.getByRole("button", { name: /Switch language/i }));

    expect(changeLanguage).toHaveBeenCalledWith("en");
    expect(localStorage.getItem("lang")).toBe("en");
  });
});
