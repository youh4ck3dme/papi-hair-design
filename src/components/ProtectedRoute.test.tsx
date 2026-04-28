import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const mockedUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockedUseAuth(),
}));

type MockAuthState = {
  user: { id: string; email?: string | null } | null;
  memberships: Array<{ role: "owner" | "admin" | "employee" | "customer" }>;
  loading: boolean;
  membershipsLoading: boolean;
};

const settledAuthState = {
  loading: false,
  membershipsLoading: false,
} as const;

function makeAuthState(overrides: Partial<MockAuthState>): MockAuthState {
  return {
    user: null,
    memberships: [],
    ...settledAuthState,
    ...overrides,
  };
}

function setAuthState(state: MockAuthState) {
  mockedUseAuth.mockReturnValue(state);
}

function renderWithRoutes(element: ReactNode, initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth" element={<div>AUTH_PAGE</div>} />
        <Route path="/booking" element={<div>BOOKING_PAGE</div>} />
        <Route path="/admin" element={<div>ADMIN_HOME</div>} />
        <Route path="/admin/my" element={<div>MY_SCHEDULE</div>} />
        <Route path="/bootstrap" element={<div>BOOTSTRAP_PAGE</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to /auth", () => {
    setAuthState(makeAuthState({}));

    renderWithRoutes(
      <ProtectedRoute>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("AUTH_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("renders children when allowed role is present", () => {
    setAuthState(makeAuthState({
      user: { id: "u1", email: "admin@test.local" },
      memberships: [{ role: "admin" }],
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });

  it("redirects employee away from admin-only protected route to /admin/my", () => {
    setAuthState(makeAuthState({
      user: { id: "u2", email: "employee@test.local" },
      memberships: [{ role: "employee" }],
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("MY_SCHEDULE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("redirects admin away from employee-only route to /admin", () => {
    setAuthState(makeAuthState({
      user: { id: "u3", email: "admin@test.local" },
      memberships: [{ role: "admin" }],
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["employee"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("ADMIN_HOME")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("redirects customer away from admin-only route to /booking", () => {
    setAuthState(makeAuthState({
      user: { id: "u4", email: "customer@test.local" },
      memberships: [{ role: "customer" }],
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("BOOKING_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it.each([
    {
      name: "redirects authenticated user without memberships away from protected admin route to /booking",
      user: { id: "u5", email: "visitor@test.local" },
      allowedRoles: ["owner", "admin"] as const,
    },
    {
      name: "redirects user without employee membership away from employee routes to /booking",
      user: { id: "u8", email: "mato@papihairdesign.sk" },
      allowedRoles: ["employee"] as const,
    },
  ])("$name", ({ user, allowedRoles }) => {
    setAuthState(
      makeAuthState({
        user,
      })
    );

    renderWithRoutes(
      <ProtectedRoute allowedRoles={[...allowedRoles]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("BOOKING_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("redirects allowlisted admin email to /bootstrap when membership is missing", () => {
    setAuthState(makeAuthState({
      user: { id: "u6", email: "papi@papihairdesign.sk" },
      memberships: [],
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("BOOTSTRAP_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("does not force /bootstrap for allowlisted employee with existing membership", () => {
    setAuthState(makeAuthState({
      user: { id: "u7", email: "mato@papihairdesign.sk" },
      memberships: [{ role: "employee" }],
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin", "employee"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("SECRET")).toBeInTheDocument();
    expect(screen.queryByText("BOOTSTRAP_PAGE")).not.toBeInTheDocument();
  });

  it("shows loading UI while memberships are still hydrating", () => {
    setAuthState(makeAuthState({
      user: { id: "u9", email: "owner@test.local" },
      membershipsLoading: true,
    }));

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("BOOKING_PAGE")).not.toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });
});
