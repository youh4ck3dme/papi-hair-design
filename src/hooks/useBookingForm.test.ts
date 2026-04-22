import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmployeeRow, MembershipRow, ServiceRow } from "@/components/booking/types";
import type { ServiceSubcategoryRow } from "@/lib/serviceSubcategories";
import { useBookingForm } from "./useBookingForm";

const mockUseAuth = vi.fn();
const mockCreateBookingHold = vi.fn();
const mockConfirmBooking = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/integrations/firebase/createBookingHold", () => ({
  createBookingHold: (...args: unknown[]) => mockCreateBookingHold(...args),
}));

vi.mock("@/integrations/firebase/confirmBooking", () => ({
  confirmBooking: (...args: unknown[]) => mockConfirmBooking(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const makeService = (overrides: Partial<ServiceRow> = {}): ServiceRow => ({
  id: "svc-1",
  name_sk: "Dámsky strih",
  description_sk: null,
  price: 25,
  duration_minutes: 30,
  buffer_minutes: 0,
  sort_order: 1,
  is_active: true,
  business_id: "biz-1",
  category: "damske",
  subcategory: "Strih",
  ...overrides,
});

const makeEmployee = (overrides: Partial<EmployeeRow> = {}): EmployeeRow => ({
  id: "emp-1",
  display_name: "Papi",
  email: "papi@test.sk",
  phone: null,
  is_active: true,
  business_id: "biz-1",
  photo_url: null,
  profile_id: null,
  service_mode: "all",
  ...overrides,
});

const baseBusiness = {
  id: "biz-1",
  allow_admin_as_provider: true,
};

const memberships: MembershipRow[] = [];
const serviceSubcategories: ServiceSubcategoryRow[] = [];

describe("useBookingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: null,
    });
    mockCreateBookingHold.mockResolvedValue({
      success: true,
      appointment_id: "appt-1",
      confirm_token: "confirm-1",
    });
    mockConfirmBooking.mockResolvedValue({
      success: true,
      claim_token: "claim-1",
      history_access_token: "history-token",
      history_reference: "history-ref",
      customer_email: "test@example.com",
      customer_name: "Test User",
    });
  });

  it("does not auto-select employee after service selection", async () => {
    const services = [makeService()];
    const employees = [
      makeEmployee({ id: "emp-1", display_name: "Papi" }),
      makeEmployee({ id: "emp-2", display_name: "Miška", service_mode: "restricted" }),
    ];
    const employeeServiceMap = {
      "emp-2": ["svc-1"],
    };

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, employeeServiceMap, memberships)
    );

    expect(result.current.selectedEmployeeId).toBeNull();

    act(() => {
      result.current.setSelectedServiceId("svc-1");
    });

    await waitFor(() => {
      expect(result.current.selectedEmployeeId).toBeNull();
    });
  });

  it("clears selected employee when service is reset", async () => {
    const services = [makeService()];
    const employees = [makeEmployee({ id: "emp-1" })];

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, {}, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-1");
      result.current.setSelectedEmployeeId("emp-1");
    });

    await waitFor(() => {
      expect(result.current.selectedEmployeeId).toBe("emp-1");
    });

    act(() => {
      result.current.setSelectedServiceId(null);
    });

    await waitFor(() => {
      expect(result.current.selectedEmployeeId).toBeNull();
    });
  });

  it("sends selected employee_id to createBookingHold on submit", async () => {
    const services = [makeService()];
    const employees = [
      makeEmployee({ id: "emp-1", display_name: "Papi" }),
      makeEmployee({ id: "emp-2", display_name: "Miška" }),
    ];

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, {}, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-1");
      result.current.setSelectedEmployeeId("emp-2");
    });

    act(() => {
      result.current.setFormData({
        meno: "Test",
        priezvisko: "User",
        email: "test@example.com",
        phone: "905123456",
        note: "",
        marketing: false,
        terms: true,
        gdpr: true,
        all: false,
      });
    });

    await waitFor(() => {
      expect(result.current.selectedEmployeeId).toBe("emp-2");
    });

    const slot = new Date(2026, 2, 20, 9, 0, 0);

    await act(async () => {
      await result.current.handleSubmit("09:00", [slot], result.current.selectedEmployeeId);
    });

    expect(mockCreateBookingHold).toHaveBeenCalledTimes(1);
    expect(mockCreateBookingHold).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: "biz-1",
        service_id: "svc-1",
        employee_id: "emp-2",
      })
    );
    expect(mockConfirmBooking).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("keeps stylist unselected even when exactly one employee is available", async () => {
    const services = [makeService()];
    const employees = [makeEmployee({ id: "emp-only", display_name: "Only One" })];

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, {}, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-1");
    });

    await waitFor(() => {
      expect(result.current.selectedEmployeeId).toBeNull();
    });
  });

  it("allows Papi to stay available for every service in all-services mode", async () => {
    const services = [
      makeService({ id: "svc-cut", name_sk: "Dámsky strih", category: "damske", subcategory: null }),
      makeService({ id: "svc-color", name_sk: "Melír", category: "damske", subcategory: null }),
    ];
    const employees = [
      makeEmployee({ id: "papi", display_name: "Papi", service_mode: "all" }),
      makeEmployee({ id: "mato", display_name: "Mato", service_mode: "restricted" }),
    ];
    const employeeServiceMap = {
      mato: ["svc-cut"],
    };

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, employeeServiceMap, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-color");
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees.map((employee) => employee.display_name)).toEqual(["Papi"]);
    });
  });

  it("keeps Mato available only for explicitly assigned services", async () => {
    const services = [
      makeService({ id: "svc-cut", name_sk: "Dámsky strih", category: "damske", subcategory: null }),
      makeService({ id: "svc-beard", name_sk: "Melír", category: "damske", subcategory: null }),
    ];
    const employees = [
      makeEmployee({ id: "mato", display_name: "Mato", service_mode: "restricted" }),
      makeEmployee({ id: "papi", display_name: "Papi", service_mode: "all" }),
    ];
    const employeeServiceMap = {
      mato: ["svc-cut"],
    };

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, employeeServiceMap, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-cut");
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees.map((employee) => employee.display_name)).toEqual(["Papi", "Mato"]);
    });

    act(() => {
      result.current.setSelectedServiceId("svc-beard");
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees.map((employee) => employee.display_name)).toEqual(["Papi"]);
    });
  });

  it("hides Miska completely in restricted mode when she has no assigned services", async () => {
    const services = [makeService({ id: "svc-cut", name_sk: "Dámsky strih" })];
    const employees = [
      makeEmployee({ id: "miska", display_name: "Miska", service_mode: "restricted" }),
      makeEmployee({ id: "papi", display_name: "Papi", service_mode: "all" }),
    ];

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, {}, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-cut");
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees.map((employee) => employee.display_name)).toEqual(["Papi"]);
    });
  });

  it("auto-selects the only available managed subcategory and filters services by it", async () => {
    const services = [
      makeService({ id: "svc-1", name_sk: "Dámsky strih", subcategory: "Strih", subcategory_id: "sub-1" }),
    ];
    const subcategories: ServiceSubcategoryRow[] = [
      {
        id: "sub-1",
        business_id: "biz-1",
        category: "damske",
        name_sk: "Strih",
        slug: "strih",
        sort_order: 100,
        is_active: true,
      },
    ];

    const { result } = renderHook(() =>
      useBookingForm(services, subcategories, [], baseBusiness, {}, memberships)
    );

    await waitFor(() => {
      expect(result.current.subcategoryOptions).toHaveLength(1);
      expect(result.current.subcategory).toBe("subcategory:sub-1");
    });

    expect(result.current.filteredServices.map((service) => service.id)).toEqual(["svc-1"]);
  });

  it("keeps Papi first whenever he is available alongside other stylists", async () => {
    const services = [makeService({ id: "svc-cut", name_sk: "Dámsky strih" })];
    const employees = [
      makeEmployee({ id: "mato", display_name: "Mato", service_mode: "all" }),
      makeEmployee({ id: "papi", display_name: "Papi", service_mode: "all" }),
      makeEmployee({ id: "miska", display_name: "Miska", service_mode: "all" }),
    ];

    const { result } = renderHook(() =>
      useBookingForm(services, serviceSubcategories, employees, baseBusiness, {}, memberships)
    );

    act(() => {
      result.current.setSelectedServiceId("svc-cut");
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees.map((employee) => employee.display_name)).toEqual([
        "Papi",
        "Mato",
        "Miska",
      ]);
    });
  });
});
