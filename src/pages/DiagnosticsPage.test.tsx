import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DiagnosticsPage from "./DiagnosticsPage";

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
}));

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ __collection: name }),
    limit: (value: number) => ({ type: "limit", value }),
    query: (base: any, ...constraints: any[]) => ({ __collection: base?.__collection, constraints }),
    getDocs: firestoreMocks.getDocs,
  };
});

describe("DiagnosticsPage", () => {
  beforeEach(() => {
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
    vi.stubEnv("VITE_FIREBASE_API_KEY", "api");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project-1");
  });

  it("renders diagnostics screen in test environment without key", async () => {
    render(
      <MemoryRouter initialEntries={["/diagnostics"]}>
        <DiagnosticsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Diagnostika: Firebase")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Firebase \(DB\):/i)).toBeInTheDocument();
    });
  });

  it("shows ok summary when env and firestore check succeed", async () => {
    render(
      <MemoryRouter initialEntries={["/diagnostics?key=diagnostics"]}>
        <DiagnosticsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Diagnostika: Firebase")).toBeInTheDocument();
    await waitFor(() => {
      expect(firestoreMocks.getDocs).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/Firebase \(DB\): OK/i)).toBeInTheDocument();
    expect(screen.getByText(/Projekt:/i)).toBeInTheDocument();
  });

  it("shows quick fix card when firestore check fails", async () => {
    firestoreMocks.getDocs.mockRejectedValueOnce(new Error("denied"));

    render(
      <MemoryRouter initialEntries={["/diagnostics?key=diagnostics"]}>
        <DiagnosticsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Rýchly postup")).toBeInTheDocument();
    expect(screen.getByText(/denied/i)).toBeInTheDocument();
  });
});
