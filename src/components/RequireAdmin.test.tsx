import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequireAdmin from "./RequireAdmin";

const authState = vi.hoisted(() => ({
  value: {
    user: null as { id: string; email?: string | null } | null,
    memberships: [] as Array<{ business_id: string; role: "owner" | "admin" | "employee" | "customer" }>,
    loading: false,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState.value,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderRoute(element: ReactNode, initialPath = "/admin/calendar?view=week") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/login" element={<LocationProbe />} />
        <Route path="/booking" element={<div>BOOKING_PAGE</div>} />
        <Route path="/admin/calendar" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAdmin", () => {
  beforeEach(() => {
    authState.value = { user: null, memberships: [], loading: false };
  });

  it("waits for auth and memberships before redirecting", () => {
    authState.value = { user: null, memberships: [], loading: true };

    renderRoute(
      <RequireAdmin>
        <div>ADMIN_CALENDAR</div>
      </RequireAdmin>,
    );

    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_CALENDAR")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to admin login with a safe return path", () => {
    renderRoute(
      <RequireAdmin>
        <div>ADMIN_CALENDAR</div>
      </RequireAdmin>,
    );

    expect(screen.getByTestId("location")).toHaveTextContent("/admin/login?returnTo=%2Fadmin%2Fcalendar%3Fview%3Dweek");
  });

  it("renders only when owner/admin membership belongs to the active business tenant", () => {
    authState.value = {
      user: { id: "u1", email: "owner@test.local" },
      memberships: [
        { business_id: "other-biz", role: "owner" },
        { business_id: "papi-hair-design-main", role: "employee" },
      ],
      loading: false,
    };

    renderRoute(
      <RequireAdmin>
        <div>ADMIN_CALENDAR</div>
      </RequireAdmin>,
    );

    expect(screen.getByText("BOOKING_PAGE")).toBeInTheDocument();
  });

  it("allows owner/admin membership for the active tenant", () => {
    authState.value = {
      user: { id: "u2", email: "admin@test.local" },
      memberships: [{ business_id: "papi-hair-design-main", role: "admin" }],
      loading: false,
    };

    renderRoute(
      <RequireAdmin>
        <div>ADMIN_CALENDAR</div>
      </RequireAdmin>,
    );

    expect(screen.getByText("ADMIN_CALENDAR")).toBeInTheDocument();
  });
});
