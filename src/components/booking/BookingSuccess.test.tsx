import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BookingSuccess } from "./BookingSuccess";
import type { BookingResult, ServiceRow } from "./types";

vi.mock("@/components/booking/BookingUI", () => ({
  GoldText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/lib/calendarExport", () => ({
  buildGoogleCalendarUrl: vi.fn(() => "https://calendar.google.com/fake"),
  buildIcsContent: vi.fn(() => "BEGIN:VCALENDAR"),
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

describe("BookingSuccess", () => {
  it("renders success confirmation title", () => {
    render(
      <BookingSuccess
        bookingResult={makeResult()}
        selectedService={null}
        selectedFullDate={null}
        selectedTime={null}
        dateLocale={undefined}
      />,
      { wrapper }
    );
    expect(screen.getByTestId("booking-success")).toBeInTheDocument();
    expect(screen.getByText(/Rezervácia potvrdená/i)).toBeInTheDocument();
  });

  it("renders service name when service is provided", () => {
    render(
      <BookingSuccess
        bookingResult={makeResult()}
        selectedService={makeService()}
        selectedFullDate={new Date(2026, 3, 20)}
        selectedTime="10:30"
        dateLocale={undefined}
      />,
      { wrapper }
    );
    expect(screen.getByText("Dámsky strih")).toBeInTheDocument();
  });

  it("renders PAPI HAIR DESIGN brand in summary", () => {
    render(
      <BookingSuccess
        bookingResult={makeResult()}
        selectedService={makeService()}
        selectedFullDate={new Date(2026, 3, 20)}
        selectedTime="10:30"
        dateLocale={undefined}
      />,
      { wrapper }
    );
    expect(screen.getAllByText(/PAPI HAIR DESIGN/i).length).toBeGreaterThan(0);
  });

  it("renders the updated header logo asset", () => {
    render(
      <BookingSuccess
        bookingResult={makeResult()}
        selectedService={makeService()}
        selectedFullDate={new Date(2026, 3, 20)}
        selectedTime="10:30"
        dateLocale={undefined}
      />,
      { wrapper }
    );

    const logo = screen.getByAltText("PAPI HAIR DESIGN");
    expect(logo).toHaveAttribute("src", "/favicon-32x32.png");
  });

  it("renders history link with access token", () => {
    render(
      <BookingSuccess
        bookingResult={makeResult({
          history_access_token: "tok-abc",
          history_reference: "REF123",
        })}
        selectedService={null}
        selectedFullDate={null}
        selectedTime={null}
        dateLocale={undefined}
      />,
      { wrapper }
    );
    const historyLink = screen.getByRole("link", { name: /Moje rezervácie/i });
    expect(historyLink).toHaveAttribute("href", expect.stringContaining("tok-abc"));
  });

  it("renders new booking button", () => {
    render(
      <BookingSuccess
        bookingResult={makeResult()}
        selectedService={null}
        selectedFullDate={null}
        selectedTime={null}
        dateLocale={undefined}
      />,
      { wrapper }
    );
    expect(screen.getByRole("button", { name: /Nová rezervácia/i })).toBeInTheDocument();
  });
});
