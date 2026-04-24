import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBusiness, DEMO_BUSINESS_ID } from "./useBusiness";

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

type TestMembership = {
  id: string;
  business_id: string;
  profile_id: string;
  role: "owner" | "admin" | "employee";
};

const testUser = { id: "u1", email: "a@b.sk", uid: "u1" };

const makeMembership = (overrides: Partial<TestMembership> = {}): TestMembership => ({
  id: "m1",
  business_id: "b-123",
  profile_id: "u1",
  role: "owner",
  ...overrides,
});

function mockAuthState(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    profile: null,
    memberships: [],
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    ...overrides,
  });
}

function renderUseBusiness() {
  return renderHook(() => useBusiness()).result.current;
}

describe("useBusiness", () => {
  beforeEach(() => {
    mockAuthState();
  });

  it("returns DEMO_BUSINESS_ID when no memberships", () => {
    const state = renderUseBusiness();
    expect(state.businessId).toBe(DEMO_BUSINESS_ID);
    expect(state.role).toBeNull();
  });

  it("returns business_id and role when one membership", () => {
    mockAuthState({
      user: testUser,
      memberships: [makeMembership()],
    });
    const state = renderUseBusiness();
    expect(state.businessId).toBe("b-123");
    expect(state.role).toBe("owner");
    expect(state.isOwnerOrAdmin).toBe(true);
  });

  it("prefers owner over admin", () => {
    mockAuthState({
      user: testUser,
      memberships: [
        makeMembership({ id: "m1", business_id: "b-a", role: "admin" }),
        makeMembership({ id: "m2", business_id: "b-o", role: "owner" }),
      ],
    });
    const state = renderUseBusiness();
    expect(state.role).toBe("owner");
    expect(state.businessId).toBe("b-o");
  });

  it("prefers primary business when role priority is tied", () => {
    mockAuthState({
      user: testUser,
      memberships: [
        makeMembership({ id: "m1", business_id: "legacy-biz", role: "owner" }),
        makeMembership({ id: "m2", business_id: "papi-hair-design-main", role: "admin" }),
        makeMembership({ id: "m3", business_id: "papi-hair-design-main", role: "owner" }),
      ],
    });

    const state = renderUseBusiness();
    expect(state.businessId).toBe("papi-hair-design-main");
    expect(state.role).toBe("owner");
  });

  it("prefers primary business before a higher role in another tenant", () => {
    mockAuthState({
      user: testUser,
      memberships: [
        makeMembership({ id: "m1", business_id: "other-business", role: "owner" }),
        makeMembership({ id: "m2", business_id: "papi-hair-design-main", role: "admin" }),
      ],
    });

    const state = renderUseBusiness();
    expect(state.businessId).toBe("papi-hair-design-main");
    expect(state.role).toBe("admin");
  });

  it("isEmployee true for employee role", () => {
    mockAuthState({
      user: testUser,
      memberships: [makeMembership({ business_id: "b1", role: "employee" })],
    });
    const state = renderUseBusiness();
    expect(state.isEmployee).toBe(true);
    expect(state.isOwnerOrAdmin).toBe(false);
  });
});
