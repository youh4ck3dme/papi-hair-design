import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ServiceSelection } from "./ServiceSelection";
import type { ServiceRow } from "./types";
import type { ServiceSubcategoryOption } from "@/lib/serviceSubcategories";

vi.mock("@/components/booking/BookingUI", () => ({
  GoldText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  StepHeader: ({
    num,
    title,
    extra,
  }: {
    num: string;
    title: string;
    extra?: React.ReactNode;
  }) => (
    <div data-testid={`step-header-${num}`}>
      <span>{title}</span>
      {extra}
    </div>
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
  subcategoryOptions: [] as ServiceSubcategoryOption[],
  showSubcategoryStep: false,
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

  it("renders subcategory buttons when the category contains grouped services", () => {
    render(
      <ServiceSelection
        {...defaultProps}
        category="damske"
        showSubcategoryStep
        subcategoryOptions={[
          {
            key: "subcategory:strih",
            id: "sub-1",
            category: "damske",
            name_sk: "Strih",
            slug: "strih",
            sort_order: 100,
            isFallback: false,
            isUncategorized: false,
            serviceCount: 1,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /dámske/i }));
    expect(screen.getByRole("button", { name: "Strih" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /dámske/i }));
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
    fireEvent.click(screen.getByRole("button", { name: /dámske/i }));
    fireEvent.click(screen.getByText("Dámsky strih"));
    expect(setSelectedServiceId).toHaveBeenCalledWith("svc-1");
  });

  it("attaches the provided services section ref once services are visible", () => {
    const servicesSectionRef = createRef<HTMLDivElement>();
    render(
      <ServiceSelection
        {...defaultProps}
        category="damske"
        filteredServices={[makeService()]}
        servicesSectionRef={servicesSectionRef}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /dámske/i }));

    expect(servicesSectionRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
