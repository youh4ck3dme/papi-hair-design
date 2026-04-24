import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingSuccess } from "./BookingSuccess";
import type { BookingResult, ServiceRow } from "./types";

const authState = vi.hoisted(() => ({
  user: null as { id: string; email: string | null } | null,
}));

const resolveBookingAccountStateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/calendarExport", () => ({
  buildBookingCalendarExport: vi.fn((input) => input),
  buildBookingIcsDownloadUrl: vi.fn((reference: string, accessToken: string) => `/calendar/invite.ics?ref=${reference}&access=${accessToken}`),
  buildBookingIcsFilename: vi.fn(() => "papi-hair-design-damsky-strih.ics"),
  buildGoogleCalendarUrl: vi.fn(() => "https://calendar.google.com/fake"),
  buildIcsContent: vi.fn(() => "BEGIN:VCALENDAR"),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    fbUser: null,
    profile: null,
    memberships: [],
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

vi.mock("@/integrations/firebase/resolveBookingAccountState", () => ({
  resolveBookingAccountState: (...args: unknown[]) => resolveBookingAccountStateMock(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "booking.confirmTitle": "Rezervácia potvrdená",
        "booking.confirmDesc": "Potvrdenie bolo odoslané na váš e-mail.",
        "booking.emailConfirmationTitle": "Potvrdenie bolo odoslané na email",
        "booking.emailConfirmationDesc": "Skontrolujte si doručenú poštu aj priečinok spam.",
        "booking.emailCopy": "Kopírovať",
        "booking.emailCopied": "Skopírované",
        "booking.confirmBrand": "Salón",
        "booking.confirmService": "Služba",
        "booking.confirmDate": "Dátum",
        "booking.confirmTime": "Čas",
        "booking.accountExistingTitle": "Váš účet už existuje",
        "booking.accountExistingDesc": "Prihláste sa a rezerváciu pripojíme k vášmu účtu.",
        "booking.accountKnownTitle": "Ste už v systéme",
        "booking.accountKnownDesc": "Dokončite si účet a spravujte rezervácie pohodlnejšie.",
        "booking.accountNewTitle": "Vytvorte si účet",
        "booking.accountNewDesc": "Uložte si rezerváciu do nového účtu a spravujte ju online.",
        "booking.accountExistingPrimary": "Prihlásiť sa",
        "booking.accountExistingSecondary": "Obnoviť heslo",
        "booking.accountCreatePrimary": "Vytvoriť účet",
        "booking.accountCreateSecondary": "Už mám účet",
        "booking.historyCta": "Moje rezervácie",
        "booking.newBooking": "Nová rezervácia",
        "booking.addToGoogleCalendar": "Pridať do Google Kalendára",
        "booking.downloadIcs": "Stiahnuť ICS",
        "index.address": "Spoločenský pavilón, Košice",
      };

      if (key === "booking.calendarDescription") {
        return `Služba: ${values?.service ?? ""}`;
      }

      return translations[key] ?? key;
    },
    i18n: {
      language: "sk",
      changeLanguage: vi.fn(),
    },
  }),
}));

const makeResult = (overrides: Partial<BookingResult> = {}): BookingResult => ({
  appointment_id: "appt-1",
  confirm_token: "tok-1",
  claim_token: "claim-1",
  history_access_token: "history-tok",
  history_reference: "REF001",
  customer_email: "test@test.sk",
  customer_name: "Jana Nová",
  ...overrides,
});

const makeService = (): ServiceRow => ({
  id: "svc-1",
  name_sk: "Dámsky strih",
  description_sk: null,
  price: 25,
  duration_minutes: 45,
  buffer_minutes: 0,
  is_active: true,
  business_id: "biz-1",
  category: "damske",
  subcategory: null,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

type RenderSuccessOverrides = {
  bookingResult?: Partial<BookingResult>;
  selectedService?: ServiceRow | null;
  selectedFullDate?: Date | null;
  selectedTime?: string | null;
};

function renderBookingSuccess({
  bookingResult,
  selectedService = null,
  selectedFullDate = null,
  selectedTime = null,
}: RenderSuccessOverrides = {}) {
  return render(
    <BookingSuccess
      bookingResult={makeResult(bookingResult)}
      selectedService={selectedService}
      selectedFullDate={selectedFullDate}
      selectedTime={selectedTime}
      dateLocale={undefined}
    />,
    { wrapper }
  );
}

describe("BookingSuccess", () => {
  beforeEach(() => {
    authState.user = { id: "signed-in", email: "test@test.sk" };
    resolveBookingAccountStateMock.mockResolvedValue({
      success: true,
      state: "new_customer",
      email: "test@test.sk",
      has_password: false,
      has_google: false,
    });
  });

  it("renders success confirmation title", () => {
    renderBookingSuccess();
    expect(screen.getByTestId("booking-success")).toBeInTheDocument();
    expect(screen.getByText(/Rezervácia potvrdená/i)).toBeInTheDocument();
  });

  it("renders service name when service is provided", () => {
    renderBookingSuccess({
      selectedService: makeService(),
      selectedFullDate: new Date(2026, 3, 20),
      selectedTime: "10:30",
    });
    expect(screen.getByText("Dámsky strih")).toBeInTheDocument();
  });

  it("renders PAPI HAIR DESIGN brand in summary", () => {
    renderBookingSuccess({
      selectedService: makeService(),
      selectedFullDate: new Date(2026, 3, 20),
      selectedTime: "10:30",
    });
    expect(screen.getAllByText(/PAPI HAIR DESIGN/i).length).toBeGreaterThan(0);
  });

  it("renders the shared sticky header", () => {
    renderBookingSuccess({
      selectedService: makeService(),
      selectedFullDate: new Date(2026, 3, 20),
      selectedTime: "10:30",
    });

    expect(screen.getByTestId("public-sticky-header")).toBeInTheDocument();
  });

  it("renders history link with access token", () => {
    renderBookingSuccess({
      bookingResult: {
        history_access_token: "tok-abc",
        history_reference: "REF123",
      },
    });
    const historyLink = screen.getByRole("link", { name: /Moje rezervácie/i });
    expect(historyLink).toHaveAttribute("href", expect.stringContaining("tok-abc"));
  });

  it("renders ICS download link through the public invite endpoint when history access is available", () => {
    renderBookingSuccess({
      bookingResult: {
        history_access_token: "tok-ics",
        history_reference: "REFICS",
      },
      selectedService: makeService(),
      selectedFullDate: new Date(2026, 3, 20),
      selectedTime: "10:30",
    });

    expect(screen.getByRole("link", { name: /Stiahnuť ICS/i })).toHaveAttribute(
      "href",
      "/calendar/invite.ics?ref=REFICS&access=tok-ics",
    );
  });

  it("renders new booking button", () => {
    renderBookingSuccess();
    expect(screen.getByRole("button", { name: /Nová rezervácia/i })).toBeInTheDocument();
  });

  it("renders confirmation email with copy action", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderBookingSuccess({
      bookingResult: { customer_email: "test@test.sk" },
    });

    expect(screen.getByText("test@test.sk")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Kopírovať/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("test@test.sk");
    });
    expect(screen.getByRole("button", { name: /Skopírované/i })).toBeInTheDocument();
  });

  it("shows login-first account CTA when booking email already has an account", async () => {
    authState.user = null;
    resolveBookingAccountStateMock.mockResolvedValue({
      success: true,
      state: "existing_account",
      email: "test@test.sk",
      has_password: true,
      has_google: true,
    });

    renderBookingSuccess({
      bookingResult: { customer_record_status: "existing" },
      selectedService: makeService(),
      selectedFullDate: new Date(2026, 3, 20),
      selectedTime: "10:30",
    });

    expect(await screen.findByRole("link", { name: /Prihlásiť sa/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/auth?mode=login"),
    );
    expect(screen.getByRole("link", { name: /Obnoviť heslo/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/auth?mode=forgot"),
    );
  });
});
