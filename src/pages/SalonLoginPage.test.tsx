import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/config", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button type="button">SK</button>,
}));
vi.mock("@/lib/firebaseClientErrors", () => ({
  getFirebaseErrorCode: vi.fn(() => "auth/wrong-password"),
  isBlockedByClientError: vi.fn(() => false),
  isIgnorableBlockedFirestoreError: vi.fn(() => false),
  warnBlockedByClientOnce: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderPage = async () => {
  const { default: SalonLoginPage } = await import("./SalonLoginPage");
  render(
    <MemoryRouter>
      <SalonLoginPage />
    </MemoryRouter>
  );
};

describe("SalonLoginPage", () => {
  it("renders all three staff profile cards", async () => {
    await renderPage();
    expect(screen.getByText("Papi")).toBeInTheDocument();
    expect(screen.getByText("Miška")).toBeInTheDocument();
    expect(screen.getByText("Maťo")).toBeInTheDocument();
  });

  it("renders role labels for each profile", async () => {
    await renderPage();
    expect(screen.getByText("Majiteľ & Kaderník")).toBeInTheDocument();
    expect(screen.getByText("Stylistka")).toBeInTheDocument();
    expect(screen.getByText("Barber")).toBeInTheDocument();
  });

  it("shows login form after clicking a profile card", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Papi"));
    expect(await screen.findByPlaceholderText(/heslo/i)).toBeInTheDocument();
  });

  it("renders password toggle button in login form", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Papi"));
    const toggleBtn = await screen.findByRole("button", { name: /show|hide|zobraziť/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it("renders language toggle in header", async () => {
    await renderPage();
    expect(screen.getByText("SK")).toBeInTheDocument();
  });
});
