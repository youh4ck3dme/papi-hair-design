import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyAccountPage from "./MyAccountPage";

const authState = vi.hoisted(() => ({
  value: {
    user: null as { id: string; email: string | null } | null,
    fbUser: null,
    profile: null,
    memberships: [],
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState.value,
}));

describe("MyAccountPage", () => {
  beforeEach(() => {
    authState.value = {
      user: null,
      fbUser: null,
      profile: null,
      memberships: [],
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    };
  });

  it("renders the account shell and all three client actions", () => {
    render(
      <MemoryRouter initialEntries={["/my-account"]}>
        <Routes>
          <Route path="/my-account" element={<MyAccountPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("my-account-hero-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Môj účet/i })).toBeInTheDocument();
    const loginButton = screen.getByRole("button", { name: /^Prihlásenie$/i });
    const registerButton = screen.getByRole("button", { name: /^Registrácia$/i });
    const historyButton = screen.getByRole("button", { name: /^Moje rezervácie$/i });

    expect(loginButton).toBeInTheDocument();
    expect(registerButton).toBeInTheDocument();
    expect(historyButton).toBeInTheDocument();
    expect(loginButton.className).toContain("rounded-[7px]");
    expect(registerButton.className).toContain("rounded-[7px]");
    expect(historyButton.className).toContain("rounded-[7px]");
  });

  it("navigates to register flow from the register panel", () => {
    render(
      <MemoryRouter initialEntries={["/my-account"]}>
        <Routes>
          <Route path="/my-account" element={<MyAccountPage />} />
          <Route path="/auth" element={<div>Auth route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Registrácia$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Spustiť registráciu/i }));

    expect(screen.getByText("Auth route")).toBeInTheDocument();
  });

  it("sends signed-in user to booking history from the history panel", () => {
    authState.value = {
      ...authState.value,
      user: { id: "user-1", email: "client@example.com" },
    };

    render(
      <MemoryRouter initialEntries={["/my-account"]}>
        <Routes>
          <Route path="/my-account" element={<MyAccountPage />} />
          <Route path="/dashboard/history" element={<div>History route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Moje rezervácie$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Otvoriť dashboard/i }));

    expect(screen.getByText("History route")).toBeInTheDocument();
  });
});
