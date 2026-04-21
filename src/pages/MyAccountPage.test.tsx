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
    expect(screen.getByRole("button", { name: /^Prihlásenie$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Registrácia$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Moje rezervácie$/i })).toBeInTheDocument();
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
