import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("opens the pricing drawer after splash completes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking" element={<div>Booking route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(2800);
    });

    fireEvent.click(screen.getByRole("button", { name: /Zobraziť cenník/i }));

    expect(screen.getByText("Cenník Služieb")).toBeInTheDocument();
  });

  it("renders the sticky public header after splash completes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(2800);
    });

    expect(screen.getByTestId("public-sticky-header")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Domov" })).toBeInTheDocument();
  });

  it("navigates directly to booking from the main CTA after splash completes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking" element={<div>Booking route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(2800);
    });

    fireEvent.click(screen.getByRole("button", { name: /Rezervovať termín/i }));

    expect(screen.getByText("Booking route")).toBeInTheDocument();
  });
});
