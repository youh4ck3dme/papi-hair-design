import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingPage from "./BookingPage";

const bookingDataState = vi.hoisted(() => ({
  value: {
    services: [],
    serviceSubcategories: [],
    employees: [],
    business: { id: "biz-1", name: "PHD" },
    businessHourEntries: [],
    dateOverrides: [],
    schedules: {},
    employeeServiceMap: {},
    memberships: [],
    initialLoading: false,
  },
}));

const bookingFormState = vi.hoisted(() => ({
  value: {
    category: "damske" as const,
    setCategory: vi.fn(),
    subcategory: null as string | null,
    setSubcategory: vi.fn(),
    selectedServiceId: "svc-1" as string | null,
    setSelectedServiceId: vi.fn(),
    selectedEmployeeId: null as string | null,
    setSelectedEmployeeId: vi.fn(),
    formData: {
      meno: "",
      priezvisko: "",
      email: "",
      phone: "",
      note: "",
      marketing: false,
      terms: false,
      gdpr: false,
      all: false,
    },
    setFormData: vi.fn(),
    contactErrors: {},
    submitting: false,
    bookingDone: false,
    bookingResult: null,
    subcategoryOptions: [],
    showSubcategoryStep: false,
    filteredServices: [],
    selectedService: {
      id: "svc-1",
      name_sk: "Dámsky strih",
      description_sk: null,
      price: 25,
      duration_minutes: 30,
      buffer_minutes: 0,
      is_active: true,
      business_id: "biz-1",
      category: "damske",
      subcategory: "Strih",
    },
    filteredEmployees: [
      {
        id: "emp-1",
        display_name: "Anna",
        email: null,
        phone: null,
        is_active: true,
        business_id: "biz-1",
        photo_url: "https://cdn.example.com/anna.jpg",
        profile_id: null,
        service_mode: "all",
      },
    ],
    handleCheckAll: vi.fn(),
    handleConsentChange: vi.fn(),
    handleSubmit: vi.fn(),
  },
}));

const availabilityState = vi.hoisted(() => ({
  value: {
    selectedDate: null as number | null,
    setSelectedDate: vi.fn(),
    selectedFullDate: null as Date | null,
    selectedTime: null as string | null,
    setSelectedTime: vi.fn(),
    calendarMonth: new Date(2026, 3, 1),
    setCalendarMonth: vi.fn(),
    availableSlots: [],
    loadingSlots: false,
    availabilityStatus: "idle" as const,
    daysInMonth: 30,
    firstDayOffset: 2,
    today: new Date(2026, 3, 9),
    maxDays: 30,
    isBusinessOpenOnDay: () => true,
    timeGroups: { dopoludnia: [], popoludni: [] },
  },
}));
const authState = vi.hoisted(() => ({
  value: {
    user: null as { id: string } | null,
    memberships: [] as Array<{ business_id: string; role: "owner" | "admin" | "employee" | "customer" }>,
    loading: false,
  },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/useBookingData", () => ({
  useBookingData: () => bookingDataState.value,
}));

vi.mock("@/hooks/useBookingForm", () => ({
  useBookingForm: () => bookingFormState.value,
}));

vi.mock("@/hooks/useAvailability", () => ({
  useAvailability: () => availabilityState.value,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState.value,
}));

vi.mock("@/components/booking/BookingHeader", () => ({
  BookingHeader: () => <div data-testid="booking-header" />,
}));

vi.mock("@/components/booking/ServiceSelection", () => ({
  ServiceSelection: () => <div data-testid="service-selection" />,
}));

vi.mock("@/components/booking/EmployeeSelection", () => ({
  EmployeeSelection: () => <div data-testid="employee-selection" />,
}));

vi.mock("@/components/booking/DateTimeSelection", () => ({
  DateTimeSelection: () => <div data-testid="date-time-selection" />,
}));

vi.mock("@/components/booking/ContactConfirmation", () => ({
  ContactConfirmation: () => <div data-testid="contact-confirmation" />,
}));

vi.mock("@/components/booking/BookingSuccess", () => ({
  BookingSuccess: () => <div data-testid="booking-success" />,
}));

describe("BookingPage stylist step flow", () => {
  beforeEach(() => {
    bookingFormState.value = {
      ...bookingFormState.value,
      selectedEmployeeId: null,
    };
    availabilityState.value = {
      ...availabilityState.value,
      selectedTime: null,
    };
    bookingDataState.value = {
      ...bookingDataState.value,
      initialLoading: false,
      business: { id: "biz-1", name: "PHD" },
    };
    authState.value = { user: null, memberships: [], loading: false };
  });

  it("never skips stylist step and does not render date/time before stylist selection", () => {
    render(<BookingPage />);

    expect(screen.getByTestId("employee-selection")).toBeInTheDocument();
    expect(screen.queryByTestId("date-time-selection")).not.toBeInTheDocument();
  });

  it("does not allow continuing to contact step without stylist selection", () => {
    availabilityState.value = {
      ...availabilityState.value,
      selectedTime: "09:00",
    };

    render(<BookingPage />);

    expect(screen.queryByTestId("contact-confirmation")).not.toBeInTheDocument();
  });

  it("renders date/time step only after stylist is selected", () => {
    bookingFormState.value = {
      ...bookingFormState.value,
      selectedEmployeeId: "emp-1",
    };

    render(<BookingPage />);

    expect(screen.getByTestId("date-time-selection")).toBeInTheDocument();
  });

  it("renders the branded booking hero shell with floating logo", () => {
    render(<BookingPage />);

    expect(screen.getByTestId("booking-hero-shell")).toBeInTheDocument();
    expect(screen.getByTestId("booking-hero-logo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Rezervujte si termín/i })).toBeInTheDocument();
  });

  it("renders the unified splash while booking data is bootstrapping", () => {
    bookingDataState.value = {
      ...bookingDataState.value,
      initialLoading: true,
    };

    render(<BookingPage />);

    expect(screen.getByTestId("booking-loading-state")).toBeInTheDocument();
    expect(screen.getByTestId("booking-loading-state")).not.toHaveTextContent("Pripravujeme rezervačný kalendár");
    expect(screen.getByTestId("booking-loading-state")).not.toHaveTextContent("Načítavame služby");
  });

  it("renders the PAPI consultation info block with direct call actions", () => {
    render(<BookingPage />);

    const consultationText = screen.getByTestId("booking-papi-consultation-text");
    expect(consultationText).toBeInTheDocument();
    expect(consultationText.className).toContain("text-white/84");
    const phoneLink = screen.getByRole("link", { name: /\+421 949 459 624/i });
    const callLink = screen.getByRole("link", { name: /Volať/i });

    expect(phoneLink).toHaveAttribute("href", "tel:+421949459624");
    expect(callLink).toHaveAttribute("href", "tel:+421949459624");
    expect(phoneLink.className).toContain("rounded-[7px]");
    expect(callLink.className).toContain("rounded-[7px]");
    expect(screen.queryByText(/tel\. č\.: \+421 949 459 624/i)).not.toBeInTheDocument();
  });

  it("hides the top category pills on mobile-first layout to prioritize subcategories", () => {
    render(<BookingPage />);

    const menPill = screen.getByText(/Pánske služby/i);
    expect(menPill.parentElement?.className).toContain("hidden");
    expect(menPill.parentElement?.className).toContain("sm:flex");
  });

  it("shows a direct admin calendar entry only for owner/admin membership in the booking tenant", () => {
    authState.value = {
      user: { id: "owner-1" },
      memberships: [{ business_id: "biz-1", role: "admin" }],
      loading: false,
    };

    render(<BookingPage />);

    expect(screen.getByRole("link", { name: /Otvoriť kalendár prevádzky/i })).toHaveAttribute("href", "/admin/calendar");
  });
});
