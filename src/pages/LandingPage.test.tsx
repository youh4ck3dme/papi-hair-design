import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./LandingPage";

vi.mock("@/hooks/useBookingData", () => ({
  useBookingData: () => ({
    services: [],
    initialLoading: false,
  }),
}));

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

  it("opens the pricing drawer only after the user asks for it", async () => {
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

    expect(screen.queryByText(/Cenník služieb/i)).not.toBeInTheDocument();

    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: /Zobraziť cenník/i }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });

    expect(await screen.findByText(/Cenník služieb/i)).toBeInTheDocument();
  });

  it("closes the pricing drawer on escape", async () => {
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

    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: /Zobraziť cenník/i }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });

    expect(await screen.findByText(/Cenník služieb/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("");
    });

    expect(screen.getByRole("dialog", { name: /Cenník služieb/i })).toHaveClass("pointer-events-none");
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

  it("renders local structured data for the homepage", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts.length).toBeGreaterThanOrEqual(2);

    const payload = scripts.map((script) => script.textContent ?? "");
    expect(payload.some((entry) => entry.includes('"@type":"HairSalon"'))).toBe(true);
    expect(payload.some((entry) => entry.includes('"addressLocality":"Košice"'))).toBe(true);
    expect(payload.some((entry) => entry.includes('"telephone":"+421949459624"'))).toBe(true);
  });
});
