import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CookieConsent from "./CookieConsent";

const callableMock = vi.fn();

vi.mock("@/integrations/firebase/config", () => ({
  functions: {},
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: () => callableMock,
}));

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty("--cookie-consent-offset");
    document.body.className = "";
    callableMock.mockResolvedValue({ data: { ok: true } });
  });

  it("shows only necessary and analytics consent options", async () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Vážime si vaše súkromie/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Prispôsobiť/i }));

    expect(await screen.findByText("Analytické")).toBeInTheDocument();
    expect(screen.queryByText("Marketingové")).not.toBeInTheDocument();
  });

  it("persists only necessary and analytics preferences", async () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Prijať všetko/i }));

    await waitFor(() => {
      expect(localStorage.getItem("cookie_prefs_v1")).not.toBeNull();
    });

    expect(JSON.parse(localStorage.getItem("cookie_prefs_v1") ?? "{}")).toMatchObject({
      necessary: true,
      analytics: true,
    });
    expect(JSON.parse(localStorage.getItem("cookie_prefs_v1") ?? "{}")).not.toHaveProperty("marketing");
  });
});
