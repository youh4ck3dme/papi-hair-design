import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceSelection } from "./ServiceSelection";
import type { ServiceRow } from "./types";

vi.mock("@/components/booking/BookingUI", () => ({
  GoldText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  StepHeader: ({ num, title }: { num: string; title: string }) => (
    <div data-testid={`step-header-${num}`}>{title}</div>
  ),
  RadioIcon: ({ selected }: { selected: boolean }) => (
    <span data-testid="radio-icon" data-selected={selected} />
  ),
}));

const makeService = (overrides: Partial<ServiceRow> = {}): ServiceRow => ({
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
  ...overrides,
});

const defaultProps = {
  category: null as "damske" | "panske" | null,
  setCategory: vi.fn(),
  subcategory: null as string | null,
  setSubcategory: vi.fn(),
  subcategories: [] as string[],
  filteredServices: [] as ServiceRow[],
  selectedServiceId: null as string | null,
  setSelectedServiceId: vi.fn(),
  isBusinessOpenNow: true,
  onCategoryChange: vi.fn(),
};

describe("ServiceSelection", () => {
  it("renders open status badge when business is open", () => {
    render(<ServiceSelection {...defaultProps} />);
    expect(screen.getByText(/otvorené/i)).toBeInTheDocument();
  });

  it("renders closed status badge when business is closed", () => {
    render(<ServiceSelection {...defaultProps} isBusinessOpenNow={false} />);
    expect(screen.getByText(/zatvorené/i)).toBeInTheDocument();
  });

  it("renders both category toggle buttons", () => {
    render(<ServiceSelection {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.textContent ?? "");
    expect(labels.some((l) => /dámske/i.test(l))).toBe(true);
    expect(labels.some((l) => /pánske/i.test(l))).toBe(true);
  });

  it("calls setCategory when a category button is clicked", () => {
    const setCategory = vi.fn();
    render(<ServiceSelection {...defaultProps} setCategory={setCategory} />);
    const panskebtn = screen.getByRole("button", { name: /pánske/i });
    fireEvent.click(panskebtn);
    expect(setCategory).toHaveBeenCalledWith("panske");
  });

  it("shows service list when category is expanded and services exist", () => {
    const services = [
      makeService({ id: "svc-1", name_sk: "Dámsky strih", duration_minutes: 45 }),
      makeService({ id: "svc-2", name_sk: "Farbenie", duration_minutes: 90 }),
    ];
    render(
      <ServiceSelection
        {...defaultProps}
        category="damske"
        filteredServices={services}
      />
    );
    expect(screen.getByText("Dámsky strih")).toBeInTheDocument();
    expect(screen.getByText("Farbenie")).toBeInTheDocument();
  });

  it("calls setSelectedServiceId when a service is clicked", () => {
    const setSelectedServiceId = vi.fn();
    const services = [makeService()];
    render(
      <ServiceSelection
        {...defaultProps}
        category="damske"
        filteredServices={services}
        setSelectedServiceId={setSelectedServiceId}
      />
    );
    fireEvent.click(screen.getByText("Dámsky strih"));
    expect(setSelectedServiceId).toHaveBeenCalledWith("svc-1");
  });
});
