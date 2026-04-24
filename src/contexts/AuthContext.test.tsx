import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const authMocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

const functionMocks = vi.hoisted(() => ({
  httpsCallable: vi.fn(),
  normalizeMemberships: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  warning: vi.fn(),
}));

const blockedMocks = vi.hoisted(() => ({
  isBlockedByClientError: vi.fn(() => false),
  isIgnorableBlockedFirestoreError: vi.fn(() => false),
  warnBlockedByClientOnce: vi.fn((notify: (message: string) => void) => notify("blocked")),
}));

vi.mock("@/integrations/firebase/config", () => ({
  auth: { currentUser: null },
  db: {},
  functions: {},
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: authMocks.onAuthStateChanged,
  signOut: authMocks.signOut,
}));

vi.mock("firebase/firestore", () => ({
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  collection: firestoreMocks.collection,
  query: firestoreMocks.query,
  where: firestoreMocks.where,
  getDocs: firestoreMocks.getDocs,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: functionMocks.httpsCallable,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/lib/firebaseClientErrors", () => ({
  isBlockedByClientError: blockedMocks.isBlockedByClientError,
  isIgnorableBlockedFirestoreError: blockedMocks.isIgnorableBlockedFirestoreError,
  warnBlockedByClientOnce: blockedMocks.warnBlockedByClientOnce,
}));

function Consumer() {
  const { user, profile, memberships, loading, membershipsLoading, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="memberships-loading">{String(membershipsLoading)}</div>
      <div data-testid="user-email">{user?.email ?? "none"}</div>
      <div data-testid="profile-name">{profile?.full_name ?? "none"}</div>
      <div data-testid="membership-roles">{memberships.map((membership) => membership.role).join(",") || "none"}</div>
      <button onClick={() => { signOut(); }}>sign-out</button>
    </div>
  );
}

let authStateCallback: ((user: any) => Promise<void> | void) | null = null;

const primaryAuthenticatedUser = {
  uid: "user-1",
  email: "papi@papihairdesign.sk",
  isAnonymous: false,
};

function triggerAuthState(user: { uid: string; email: string | null; isAnonymous: boolean }) {
  act(() => {
    authStateCallback?.(user);
  });
}

async function expectSettledPrimaryUser(profileName: string) {
  await waitFor(() => {
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("memberships-loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user-email")).toHaveTextContent("papi@papihairdesign.sk");
    expect(screen.getByTestId("profile-name")).toHaveTextContent(profileName);
  });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;

    authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback;
      return vi.fn();
    });

    functionMocks.normalizeMemberships.mockResolvedValue({ data: { success: true, normalized: 1 } });
    functionMocks.httpsCallable.mockReturnValue(functionMocks.normalizeMemberships);

    firestoreMocks.doc.mockImplementation((_db, collectionName: string, docId: string) => ({
      collectionName,
      docId,
    }));
    firestoreMocks.collection.mockImplementation((_db, collectionName: string) => ({ collectionName }));
    firestoreMocks.where.mockImplementation((field: string, op: string, value: unknown) => ({ field, op, value }));
    firestoreMocks.query.mockImplementation((collectionRef: unknown, ...constraints: unknown[]) => ({
      collectionRef,
      constraints,
    }));
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: "user-1",
      data: () => ({
        full_name: "Papi Owner",
        email: "papi@papihairdesign.sk",
        phone: "+421949459624",
        avatar_url: "https://cdn.test/avatar.jpg",
      }),
    });
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "membership-1",
          data: () => ({
            business_id: "biz-1",
            profile_id: "user-1",
            role: "owner",
          }),
        },
      ],
    });
    authMocks.signOut.mockResolvedValue(undefined);
  });

  it("hydrates authenticated user profile and memberships after auth state change", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(authStateCallback).not.toBeNull();

    triggerAuthState(primaryAuthenticatedUser);
    await expectSettledPrimaryUser("Papi Owner");
    expect(screen.getByTestId("membership-roles")).toHaveTextContent("owner");

    expect(functionMocks.normalizeMemberships).toHaveBeenCalledWith({});
    expect(firestoreMocks.getDoc).toHaveBeenCalled();
    expect(firestoreMocks.getDocs).toHaveBeenCalled();
  });

  it("clears user state when auth changes to anonymous visitor", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      await authStateCallback?.({
        uid: "anon-1",
        email: null,
        isAnonymous: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("memberships-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("user-email")).toHaveTextContent("none");
      expect(screen.getByTestId("profile-name")).toHaveTextContent("none");
      expect(screen.getByTestId("membership-roles")).toHaveTextContent("none");
    });

    expect(functionMocks.normalizeMemberships).not.toHaveBeenCalled();
    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
  });

  it("warns once and keeps app stable when profile refresh hits blocked firestore request", async () => {
    blockedMocks.isIgnorableBlockedFirestoreError.mockReturnValue(true);
    firestoreMocks.getDoc.mockRejectedValueOnce(new Error("blocked"));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    triggerAuthState(primaryAuthenticatedUser);
    await expectSettledPrimaryUser("none");

    expect(blockedMocks.warnBlockedByClientOnce).toHaveBeenCalled();
    expect(toastMocks.warning).toHaveBeenCalledWith("blocked");
  });

  it("signOut clears in-memory auth state immediately", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    triggerAuthState(primaryAuthenticatedUser);

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("papi@papihairdesign.sk");
    });

    await user.click(screen.getByRole("button", { name: "sign-out" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("none");
      expect(screen.getByTestId("profile-name")).toHaveTextContent("none");
      expect(screen.getByTestId("membership-roles")).toHaveTextContent("none");
    });

    expect(authMocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps loading active until memberships query settles after login", async () => {
    let resolveMembershipQuery: ((value: unknown) => void) | null = null;
    const membershipQueryPromise = new Promise((resolve) => {
      resolveMembershipQuery = resolve;
    });
    firestoreMocks.getDocs.mockReturnValueOnce(membershipQueryPromise);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    triggerAuthState(primaryAuthenticatedUser);

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("memberships-loading")).toHaveTextContent("true");
    expect(screen.getByTestId("user-email")).toHaveTextContent("papi@papihairdesign.sk");
    expect(screen.getByTestId("membership-roles")).toHaveTextContent("none");

    await act(async () => {
      resolveMembershipQuery?.({
        docs: [
          {
            id: "membership-1",
            data: () => ({
              business_id: "biz-1",
              profile_id: "user-1",
              role: "owner",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("memberships-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("membership-roles")).toHaveTextContent("owner");
    });
  });
});
