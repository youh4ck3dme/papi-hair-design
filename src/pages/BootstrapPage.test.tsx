import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BootstrapPage from "./BootstrapPage";

const authState = vi.hoisted(() => ({
  value: {
    user: null as null | { email: string },
  },
}));

const firebaseConfigState = vi.hoisted(() => ({
  currentUser: null as null | { uid: string; email?: string | null; getIdToken: (force?: boolean) => Promise<string> },
}));

const functionMocks = vi.hoisted(() => ({
  callableImpl: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState.value,
}));

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
  auth: firebaseConfigState,
  functions: {},
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: () => functionMocks.callableImpl,
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ __collection: name }),
    doc: (arg1: any, arg2?: string, arg3?: string) => {
      if (arg3) return { __collection: arg2, id: arg3 };
      return { __collection: arg1?.__collection ?? "unknown", id: "generated-doc" };
    },
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(),
    writeBatch: firestoreMocks.writeBatch,
    query: (base: any, ...constraints: any[]) => ({ __collection: base?.__collection, constraints }),
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    getDocs: firestoreMocks.getDocs,
  };
});

function makeSnapshot(items: any[]) {
  return {
    docs: items,
  };
}

describe("BootstrapPage", () => {
  beforeEach(() => {
    authState.value = { user: null };
    firebaseConfigState.currentUser = null;
    functionMocks.callableImpl.mockReset();
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.writeBatch.mockReset();
    firestoreMocks.getDocs.mockResolvedValue(makeSnapshot([]));
    firestoreMocks.writeBatch.mockReturnValue({
      delete: vi.fn(),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("renders logged-out warning", () => {
    render(<BootstrapPage />);

    expect(screen.getByText("Admin Bootstrap")).toBeInTheDocument();
    expect(screen.getByText(/Nie si prihlásený/i)).toBeInTheDocument();
  });

  it("disables bootstrap action when firebase currentUser is missing", async () => {
    authState.value = { user: { email: "owner@example.com" } };

    render(<BootstrapPage />);
    const button = screen.getByRole("button", { name: /Aktivovať Admin prístup/i });
    expect(button).toBeDisabled();
  });

  it("shows success message after bootstrap callable succeeds", async () => {
    authState.value = { user: { email: "owner@example.com" } };
    firebaseConfigState.currentUser = {
      uid: "user-1",
      email: "owner@example.com",
      getIdToken: vi.fn().mockResolvedValue("token"),
    };
    functionMocks.callableImpl.mockResolvedValue({});

    render(<BootstrapPage />);
    fireEvent.click(screen.getByRole("button", { name: /Aktivovať Admin prístup/i }));

    await waitFor(() => {
      expect(functionMocks.callableImpl).toHaveBeenCalledWith({ business_id: "papi-hair-design-main" });
    });
    expect(await screen.findByText(/Admin prístup a prvý provider boli úspešne vytvorené/i)).toBeInTheDocument();
  });

  it("shows upload success after seeding business data", async () => {
    authState.value = { user: { email: "owner@example.com" } };
    firebaseConfigState.currentUser = {
      uid: "user-1",
      email: "owner@example.com",
      getIdToken: vi.fn().mockResolvedValue("token"),
    };
    const batch = {
      delete: vi.fn(),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    firestoreMocks.writeBatch.mockReturnValue(batch);
    firestoreMocks.getDocs
      .mockResolvedValueOnce(makeSnapshot([{ ref: "existing-hours" }]))
      .mockResolvedValueOnce(makeSnapshot([{ ref: "existing-service" }]));

    render(<BootstrapPage />);
    fireEvent.click(screen.getByRole("button", { name: /Nahrať Služby & Hodiny/i }));

    await waitFor(() => {
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });
    expect(batch.delete).toHaveBeenCalledTimes(2);
    expect(batch.set).toHaveBeenCalled();
    expect(await screen.findByText(/Dáta \(hodiny a služby\) boli úspešne nahraté/i)).toBeInTheDocument();
  });

  it("maps permission-denied callable errors to friendly text", async () => {
    authState.value = { user: { email: "owner@example.com" } };
    firebaseConfigState.currentUser = {
      uid: "user-1",
      email: "owner@example.com",
      getIdToken: vi.fn().mockResolvedValue("token"),
    };
    functionMocks.callableImpl.mockRejectedValue({ code: "functions/permission-denied" });

    render(<BootstrapPage />);
    fireEvent.click(screen.getByRole("button", { name: /Aktivovať Admin prístup/i }));

    expect(await screen.findByText(/Účet nemá admin oprávnenie/i)).toBeInTheDocument();
  });

  it("maps missing function errors to friendly text", async () => {
    authState.value = { user: { email: "owner@example.com" } };
    firebaseConfigState.currentUser = {
      uid: "user-1",
      email: "owner@example.com",
      getIdToken: vi.fn().mockResolvedValue("token"),
    };
    functionMocks.callableImpl.mockRejectedValue({ code: "functions/not-found" });

    render(<BootstrapPage />);
    fireEvent.click(screen.getByRole("button", { name: /Aktivovať Admin prístup/i }));

    expect(await screen.findByText(/Cloud Function bootstrapAdminAccess nie je nasadená/i)).toBeInTheDocument();
  });
});
