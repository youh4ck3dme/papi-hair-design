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
};

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
    setAuthState({ user: null, memberships: [], loading: false });

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
    setAuthState({
      user: { id: "u1", email: "admin@test.local" },
      memberships: [{ role: "admin" }],
      loading: false,
    });

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });

  it("redirects employee away from admin-only protected route to /admin/my", () => {
    setAuthState({
      user: { id: "u2", email: "employee@test.local" },
      memberships: [{ role: "employee" }],
      loading: false,
    });

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
    setAuthState({
      user: { id: "u3", email: "admin@test.local" },
      memberships: [{ role: "admin" }],
      loading: false,
    });

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
    setAuthState({
      user: { id: "u4", email: "customer@test.local" },
      memberships: [{ role: "customer" }],
      loading: false,
    });

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("BOOKING_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("redirects authenticated user without memberships away from protected admin route to /booking", () => {
    setAuthState({
      user: { id: "u5", email: "visitor@test.local" },
      memberships: [],
      loading: false,
    });

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("BOOKING_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("allows configured admin email to access admin route even before memberships are loaded", () => {
    setAuthState({
      user: { id: "u6", email: "papi@papihairdesign.sk" },
      memberships: [],
      loading: false,
    });

    renderWithRoutes(
      <ProtectedRoute allowedRoles={["owner", "admin"]}>
        <div>SECRET</div>
      </ProtectedRoute>,
      "/protected"
    );

    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });
});
