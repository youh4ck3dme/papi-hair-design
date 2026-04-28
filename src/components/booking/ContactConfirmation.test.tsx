import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ContactConfirmation } from "./ContactConfirmation";
import type { ServiceRow } from "./types";

vi.mock("@/components/booking/BookingUI", () => ({
  StepHeader: ({ num, title }: { num: string; title: string }) => (
    <div data-testid={`step-header-${num}`}>{title}</div>
  ),
}));

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

const baseFormData = {
  meno: "",
  priezvisko: "",
  email: "",
  phone: "",
  note: "",
  marketing: false,
  terms: false,
  gdpr: false,
  all: false,
};

const defaultProps = {
  formData: baseFormData,
  setFormData: vi.fn(),
  contactErrors: {},
  handleCheckAll: vi.fn(),
  handleConsentChange: vi.fn(),
  selectedService: null,
  selectedFullDate: null,
  selectedTime: null,
  dateLocale: undefined,
  submitting: false,
  handleSubmit: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("ContactConfirmation", () => {
  it("renders contact form fields", () => {
    render(<ContactConfirmation {...defaultProps} />, { wrapper });
    expect(screen.getByPlaceholderText(/meno/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/priezvisko/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it("renders phone input", () => {
    render(<ContactConfirmation {...defaultProps} />, { wrapper });
    expect(screen.getByPlaceholderText("9XX XXX XXX")).toBeInTheDocument();
  });

  it("shows booking summary when service and date are provided", () => {
    render(
      <ContactConfirmation
        {...defaultProps}
        selectedService={makeService()}
        selectedFullDate={new Date(2026, 3, 15)}
        selectedTime="10:00"
      />,
      { wrapper }
    );
    expect(screen.getByText("PAPI HAIR DESIGN")).toBeInTheDocument();
    expect(screen.getByText("Dámsky strih")).toBeInTheDocument();
  });

  it("calls setFormData when first name input changes", () => {
    const setFormData = vi.fn();
    render(<ContactConfirmation {...defaultProps} setFormData={setFormData} />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText(/meno/i), {
      target: { value: "Jana" },
    });
    const updater = setFormData.mock.calls[0][0];
    expect(updater(baseFormData)).toEqual(expect.objectContaining({ meno: "Jana" }));
  });

  it("shows field error when contactErrors contains an entry", () => {
    render(
      <ContactConfirmation
        {...defaultProps}
        contactErrors={{ email: "Neplatný email" }}
      />,
      { wrapper }
    );
    expect(screen.getByText("Neplatný email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByPlaceholderText(/email/i)).toHaveAttribute("aria-describedby", "booking-email-error");
  });

  it("clears a field-specific error when that field changes", () => {
    const setContactErrors = vi.fn();
    render(
      <ContactConfirmation
        {...defaultProps}
        contactErrors={{ email: "Neplatný email", meno: "Meno musí mať aspoň 2 znaky" }}
        setContactErrors={setContactErrors}
      />,
      { wrapper }
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "jana@example.sk" },
    });

    const updater = setContactErrors.mock.calls[0][0];
    expect(updater({ email: "Neplatný email", meno: "Meno musí mať aspoň 2 znaky" })).toEqual({
      meno: "Meno musí mať aspoň 2 znaky",
    });
  });

  it("renders submit button and calls handleSubmit when clicked", () => {
    const handleSubmit = vi.fn();
    render(
      <ContactConfirmation
        {...defaultProps}
        handleSubmit={handleSubmit}
        formData={{ ...baseFormData, terms: true, gdpr: true }}
      />,
      { wrapper }
    );
    const submitBtn = screen.getByTestId("booking-submit");
    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows a richer pending submit state while booking is being sent", () => {
    render(
      <ContactConfirmation
        {...defaultProps}
        submitting
      />,
      { wrapper }
    );

    expect(screen.getByRole("button", { name: /Odosielame rezerváciu/i })).toBeDisabled();
    expect(screen.getByTestId("booking-submit-hint")).toHaveTextContent(
      "Ešte chvíľu, finalizujeme termín a kontrolujeme poslednú dostupnosť vybraného slotu.",
    );
  });
});
