import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthPage from "./Auth";

const mockAuthState = vi.hoisted(() => ({
  auth: {
    currentUser: null as null | { uid: string; isAnonymous?: boolean; email?: string | null; displayName?: string | null; photoURL?: string | null },
  },
}));

const authFns = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
  linkWithCredential: vi.fn(),
  credential: vi.fn(),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider(this: { setCustomParameters: ReturnType<typeof vi.fn> }) {
    this.setCustomParameters = vi.fn();
  }),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: { type: "LOCAL" },
  browserSessionPersistence: { type: "SESSION" },
}));

const firestoreFns = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn((...segments: string[]) => ({ __segments: segments })),
  getDocs: vi.fn(),
  limit: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
}));

const callableMock = vi.hoisted(() => vi.fn());
const queueWelcomeEmailMock = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/firebase/config", () => ({
  auth: mockAuthState.auth,
  functions: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: authFns.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: authFns.createUserWithEmailAndPassword,
  signInWithPopup: authFns.signInWithPopup,
  linkWithPopup: authFns.linkWithPopup,
  linkWithCredential: authFns.linkWithCredential,
  EmailAuthProvider: { credential: authFns.credential },
  GoogleAuthProvider: authFns.GoogleAuthProvider,
  sendPasswordResetEmail: authFns.sendPasswordResetEmail,
  setPersistence: authFns.setPersistence,
  browserLocalPersistence: authFns.browserLocalPersistence,
  browserSessionPersistence: authFns.browserSessionPersistence,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

vi.mock("firebase/firestore", () => ({
  collection: firestoreFns.collection,
  doc: firestoreFns.doc,
  getDocs: firestoreFns.getDocs,
  limit: firestoreFns.limit,
  query: firestoreFns.query,
  setDoc: firestoreFns.setDoc,
  where: firestoreFns.where,
}));

vi.mock("@/integrations/firebase/queueRegistrationWelcomeEmail", () => ({
  queueRegistrationWelcomeEmail: queueWelcomeEmailMock,
}));

vi.mock("@/lib/adminAllowlist", () => ({
  isAdminAllowlisted: vi.fn(() => false),
  normalizeEmail: vi.fn((value: string) => value),
}));

vi.mock("@/components/LogoIcon", () => ({
  LogoIcon: () => <img src="/phd-logo.png" alt="PAPI HAIR DESIGN" />,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
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
          "auth.registerTitle": "Registrácia",
          "auth.registerDesc": "Vytvorte si nový účet",
          "auth.registerBtn": "Zaregistrovať sa",
          "auth.forgotTitle": "Obnova hesla",
          "auth.forgotDesc": "Zadajte email pre obnovu hesla",
          "auth.forgotBtn": "Odoslať email",
          "auth.email": "E-mail",
          "auth.emailPlaceholder": "vas@email.sk",
          "auth.password": "Heslo",
          "auth.rememberMe": "Zapamätať si ma",
          "auth.forgotLink": "Zabudnuté heslo?",
          "auth.noAccount": "Nemáte účet?",
          "auth.hasAccount": "Máte účet?",
          "auth.backToLogin": "Späť na prihlásenie",
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
          "auth.toastLoginOkBooking": "Prihlásenie úspešné. Rezervácia bola prepojená s vaším účtom.",
          "auth.toastRegisterOkBooking": "Registrácia úspešná! Rezervácia bola prepojená s vaším účtom.",
          "auth.toastRegisterOk": "Registrácia úspešná.",
          "auth.toastAccountExists": "Tento email už má účet. Prihláste sa alebo si obnovte heslo.",
          "auth.claimKnownTitle": "Máme vás v systéme",
          "auth.claimKnownRegister": "Ste už evidovaný klient. Dokončite si účet heslom a rezerváciu k nemu pripojíme.",
          "common.or": "alebo",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

function renderAuth(initialEntry = "/auth") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthPage />
    </MemoryRouter>,
  );
}

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.auth.currentUser = null;
    firestoreFns.getDocs.mockResolvedValue({ docs: [] });
    callableMock.mockResolvedValue({ data: { success: true } });
    queueWelcomeEmailMock.mockResolvedValue({ success: true });
  });

  it("renders auth shell with softer premium background", () => {
    renderAuth();
    const page = screen.getByTestId("auth-page");
    expect(page.className).toContain("bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.10),_transparent_32%),linear-gradient(135deg,_#16120e_0%,_#0d0b09_52%,_#080808_100%)]");
  });

  it("links anonymous booking guest to email-password account instead of creating a second user", async () => {
    mockAuthState.auth.currentUser = { uid: "anon-1", isAnonymous: true };
    const linkedUser = {
      user: {
        uid: "anon-1",
        email: "jana@example.sk",
        displayName: null,
        photoURL: null,
      },
    };
    authFns.credential.mockReturnValue({ providerId: "password" });
    authFns.linkWithCredential.mockResolvedValue(linkedUser);

    renderAuth("/auth?mode=register&claim=claim-1&email=jana@example.sk&name=Jana%20Nova&account=known_customer");

    fireEvent.change(screen.getByLabelText("Heslo"), { target: { value: "Secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Zaregistrovať sa" }));

    await waitFor(() => {
      expect(authFns.linkWithCredential).toHaveBeenCalledTimes(1);
    });

    expect(authFns.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(authFns.credential).toHaveBeenCalledWith("jana@example.sk", "Secret123");
    expect(firestoreFns.setDoc).toHaveBeenCalled();
    expect(callableMock).toHaveBeenCalledWith({ claim_token: "claim-1" });
    expect(queueWelcomeEmailMock).toHaveBeenCalled();
  });

  it("claims booking after classic email login", async () => {
    authFns.signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "user-1", email: "jana@example.sk", displayName: null, photoURL: null },
    });

    renderAuth("/auth?mode=login&claim=claim-login&email=jana@example.sk");

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "jana@example.sk" } });
    fireEvent.change(screen.getByLabelText("Heslo"), { target: { value: "Secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Prihlásiť sa" }));

    await waitFor(() => {
      expect(authFns.signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    });

    expect(callableMock).toHaveBeenCalledWith({ claim_token: "claim-login" });
    expect(toastSuccess).toHaveBeenCalledWith("Prihlásenie úspešné. Rezervácia bola prepojená s vaším účtom.");
  });

  it("uses submitted DOM credentials even when secure input state is stale on first submit", async () => {
    authFns.signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "owner-1", email: "owner@example.sk", displayName: null, photoURL: null },
    });

    renderAuth("/auth?mode=login");

    const emailInput = screen.getByLabelText("E-mail") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Heslo") as HTMLInputElement;
    const nativeEmailSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const nativePasswordSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    nativeEmailSetter?.call(emailInput, "owner@example.sk");
    nativePasswordSetter?.call(passwordInput, "Secret123");

    fireEvent.submit(screen.getByRole("button", { name: "Prihlásiť sa" }).closest("form")!);

    await waitFor(() => {
      expect(authFns.signInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthState.auth,
        "owner@example.sk",
        "Secret123",
      );
    });
  });

  it("links anonymous booking guest through Google provider first", async () => {
    mockAuthState.auth.currentUser = { uid: "anon-google", isAnonymous: true };
    authFns.linkWithPopup.mockResolvedValue({
      user: { uid: "anon-google", email: "jana@example.sk", displayName: "Jana Nova", photoURL: "https://cdn.example.com/a.jpg" },
    });

    renderAuth("/auth?mode=login&claim=claim-google&email=jana@example.sk");

    fireEvent.click(screen.getByRole("button", { name: "Pokračovať cez Google" }));

    await waitFor(() => {
      expect(authFns.linkWithPopup).toHaveBeenCalledTimes(1);
    });

    expect(authFns.signInWithPopup).not.toHaveBeenCalled();
    expect(callableMock).toHaveBeenCalledWith({ claim_token: "claim-google" });
  });

  it("shows account-exists guidance when registering with an already-used email", async () => {
    authFns.createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });

    renderAuth("/auth?mode=register&email=jana@example.sk");

    fireEvent.change(screen.getByLabelText("Heslo"), { target: { value: "Secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Zaregistrovať sa" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Tento email už má účet. Prihláste sa alebo si obnovte heslo.");
    });

    expect(screen.getByRole("button", { name: "Prihlásiť sa" })).toBeInTheDocument();
  });
});
