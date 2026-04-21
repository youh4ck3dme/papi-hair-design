import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AuthPage from "./Auth";

vi.mock("@/integrations/firebase/config", () => ({
  auth: {},
  functions: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: { type: "LOCAL" },
  browserSessionPersistence: { type: "SESSION" },
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/integrations/firebase/queueRegistrationWelcomeEmail", () => ({
  queueRegistrationWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/adminAllowlist", () => ({
  isAdminAllowlisted: vi.fn(() => false),
  normalizeEmail: vi.fn((value: string) => value),
}));

vi.mock("@/components/LogoIcon", () => ({
  LogoIcon: () => <img src="/phd-logo.png" alt="PAPI HAIR DESIGN" />,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">theme-toggle</button>,
}));

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button type="button">lang-toggle</button>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          "auth.loginTitle": "Prihlásenie",
          "auth.loginDesc": "Prihláste sa do svojho účtu",
          "auth.loginBtn": "Prihlásiť sa",
          "auth.email": "E-mail",
          "auth.emailPlaceholder": "vas@email.sk",
          "auth.password": "Heslo",
          "auth.rememberMe": "Zapamätať si ma",
          "auth.forgotLink": "Zabudnuté heslo?",
          "auth.noAccount": "Nemáte účet?",
          "auth.registerBtn": "Registrovať sa",
          "common.or": "alebo",
          "auth.googleBtn": "Pokračovať cez Google",
          "auth.demoLink": "Demo",
          "auth.bookingLink": "Online rezervácia",
          "auth.bookingLinkLabel": "Otvoriť booking",
          "auth.invalidEmail": "Neplatný email",
          "auth.passwordMin": "Min. 6 znakov",
          "auth.toastLoginFail": "Prihlásenie zlyhalo",
          "auth.toastRegisterFail": "Registrácia zlyhala",
          "auth.toastGoogleFail": "Google prihlásenie zlyhalo",
          "auth.toastEnterEmail": "Zadajte email",
          "auth.toastResetSent": "Reset odoslaný",
          "auth.toastResetFail": "Reset zlyhal",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe("AuthPage", () => {
  beforeAll(() => {
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();

    class ResizeObserverMock {
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("renders auth shell with softer premium background", () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    const page = screen.getByTestId("auth-page");
    expect(page.className).toContain("bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.10),_transparent_32%),linear-gradient(135deg,_#16120e_0%,_#0d0b09_52%,_#080808_100%)]");
  });

  it("renders auth card with exact 6px corners", () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    const card = screen.getByTestId("auth-card");
    expect(card.className).toContain("rounded-[6px]");
    expect(card.className).toContain("bg-[#12100d]/88");
  });
});
