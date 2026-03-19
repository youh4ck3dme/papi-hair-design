import { Children, isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CalendarPage from "../CalendarPage";

const businessState = vi.hoisted(() => ({
  value: {
    businessId: "biz-1",
    isOwnerOrAdmin: true,
    activeMembership: { profile_id: "profile-1" },
  },
}));

const useBusinessInfoState = vi.hoisted(() => ({
  value: {
    info: {
      business: { allow_admin_as_provider: true, opening_hours: {} },
      hours: [],
      overrides: [],
    },
    loading: false,
  },
}));

const bookingCalendarSpy = vi.hoisted(() => ({
  props: null as any,
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getDocMock: vi.fn(),
  addDocMock: vi.fn(),
  updateDocMock: vi.fn(),
}));
const firestoreFixtures = vi.hoisted(() => ({
  appointments: [] as any[],
  employeeLookup: [] as any[],
  services: [] as any[],
  employees: [] as any[],
  memberships: [] as any[],
  schedules: [] as any[],
  customerHistory: [] as any[],
}));

const adminUpdateBookingStatusMock = vi.hoisted(() => vi.fn());
const generateSlotsMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("@/hooks/useBusinessInfo", () => ({
  useBusinessInfo: () => useBusinessInfoState.value,
}));

vi.mock("@/components/booking-calendar", () => ({
  statusToColor: (status: string) => status,
  BookingCalendar: (props: any) => {
    bookingCalendarSpy.props = props;
    return (
      <div data-testid="booking-calendar-mock">
        <div data-testid="events-count">{String(props.events?.length ?? 0)}</div>
        <div data-testid="selectable-flag">{String(Boolean(props.selectable))}</div>
        <button
          type="button"
          onClick={() =>
            props.onSelectSlot?.({
              start: new Date("2026-01-15T09:00:00.000Z"),
              end: new Date("2026-01-15T09:30:00.000Z"),
            })
          }
        >
          open-slot
        </button>
        <button
          type="button"
          onClick={() => {
            const first = props.events?.[0];
            if (first) props.onSelectEvent?.(first);
          }}
        >
          open-event
        </button>
      </div>
    );
  },
}));

vi.mock("@/integrations/firebase/config", () => ({
  auth: { currentUser: { uid: "profile-1" } },
  db: {},
}));

vi.mock("@/integrations/firebase/adminUpdateBookingStatus", () => ({
  adminUpdateBookingStatus: adminUpdateBookingStatusMock,
}));

vi.mock("@/lib/availability", () => ({
  generateSlots: generateSlotsMock,
}));

function collectSelectItems(node: unknown): Array<{ value: string; label: string }> {
  const items: Array<{ value: string; label: string }> = [];

  Children.forEach(node as any, (child) => {
    if (!isValidElement(child)) return;

    if (child.props["data-select-item"] === "true") {
      const label = Children.toArray(child.props.children).join("").trim();
      items.push({ value: child.props["data-value"], label });
      return;
    }

    items.push(...collectSelectItems(child.props.children));
  });

  return items;
}

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => {
    const items = collectSelectItems(children);
    const label = items.some((item) => item.value.startsWith("svc-"))
      ? "service-select"
      : "employee-select";

    return (
      <select aria-label={label} value={value} onChange={(e) => onValueChange?.(e.target.value)}>
        <option value="">--</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  },
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => (
    <div data-select-item="true" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <>{placeholder ?? null}</>,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ __collection: name, constraints: [] }),
    where: (field: string, op: string, value: unknown) => ({ type: "where", field, op, value }),
    orderBy: (field: string, direction: string) => ({ type: "orderBy", field, direction }),
    limit: (value: number) => ({ type: "limit", value }),
    query: (base: any, ...constraints: any[]) => ({
      __collection: base?.__collection ?? "unknown",
      constraints: [...(base?.constraints ?? []), ...constraints],
    }),
    doc: (_db: unknown, name: string, id: string) => ({ __collection: name, id }),
    getDocs: firestoreMocks.getDocsMock,
    getDoc: firestoreMocks.getDocMock,
    addDoc: firestoreMocks.addDocMock,
    updateDoc: firestoreMocks.updateDocMock,
    Timestamp: class Timestamp {
      private d: Date;
      constructor(d: Date) {
        this.d = d;
      }
      toDate() {
        return this.d;
      }
    },
  };
});

function makeSnapshot(items: any[]) {
  return {
    empty: items.length === 0,
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
    forEach: (cb: (x: any) => void) =>
      items.forEach((item, index) =>
        cb({
          id: item.id ?? `doc-${index}`,
          data: () => item,
        }),
      ),
  };
}

function hasWhere(input: any, field: string): boolean {
  return (input?.constraints ?? []).some((c: any) => c?.type === "where" && c?.field === field);
}

function seedInitialFirestore(options?: {
  withEvent?: boolean;
  employeeProfileId?: string | null;
  nonAdmin?: boolean;
}) {
  const withEvent = options?.withEvent ?? false;
  const employeeProfileId = options?.employeeProfileId ?? "profile-1";
  const nonAdmin = options?.nonAdmin ?? false;
  const dayIso = new Date().toISOString().slice(0, 10);

  const appointments = withEvent
    ? [
        {
          id: "apt-1",
          customer_name: "Jana",
          service_name: "Strih",
          employee_name: "Marek",
          employee_color: "#22aa88",
          customer_email: "jana@example.com",
          customer_phone: "+421900000111",
          customer_id: "cust-1",
          start_at: `${dayIso}T09:00:00.000Z`,
          end_at: `${dayIso}T09:30:00.000Z`,
          status: "pending",
          note: "Poznámka",
        },
      ]
    : [];

  firestoreFixtures.appointments = appointments;
  firestoreFixtures.employeeLookup = nonAdmin ? [{ id: "emp-1", profile_id: "profile-1" }] : [];
  firestoreFixtures.services = [{ id: "svc-1", name_sk: "Strih", duration_minutes: 30, buffer_minutes: 0, price: 20 }];
  firestoreFixtures.employees = [{ id: "emp-1", display_name: "Marek", is_active: true, profile_id: employeeProfileId, color: "#123456" }];
  firestoreFixtures.memberships = [{ profile_id: "profile-1", role: "owner" }];
  firestoreFixtures.schedules = [{ employee_id: "emp-1", day_of_week: "monday", start_time: "08:00", end_time: "16:00" }];
  firestoreFixtures.customerHistory = [];
}

describe("CalendarPage", () => {
  beforeEach(() => {
    bookingCalendarSpy.props = null;
    businessState.value = {
      businessId: "biz-1",
      isOwnerOrAdmin: true,
      activeMembership: { profile_id: "profile-1" },
    };
    useBusinessInfoState.value = {
      info: {
        business: { allow_admin_as_provider: true, opening_hours: {} },
        hours: [],
        overrides: [],
      },
      loading: false,
    };

    firestoreMocks.getDocsMock.mockReset();
    firestoreMocks.getDocMock.mockReset();
    firestoreMocks.addDocMock.mockReset();
    firestoreMocks.updateDocMock.mockReset();
    adminUpdateBookingStatusMock.mockReset();
    generateSlotsMock.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();

    firestoreMocks.getDocMock.mockResolvedValue({ exists: () => true, data: () => ({}) });
    firestoreMocks.getDocsMock.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;

      if (collectionName === "appointments") {
        if (hasWhere(input, "customer_id")) return makeSnapshot(firestoreFixtures.customerHistory);
        return makeSnapshot(firestoreFixtures.appointments);
      }
      if (collectionName === "services") return makeSnapshot(firestoreFixtures.services);
      if (collectionName === "employees") {
        if (hasWhere(input, "profile_id")) return makeSnapshot(firestoreFixtures.employeeLookup);
        return makeSnapshot(firestoreFixtures.employees);
      }
      if (collectionName === "memberships") return makeSnapshot(firestoreFixtures.memberships);
      if (collectionName === "schedules") return makeSnapshot(firestoreFixtures.schedules);
      return makeSnapshot([]);
    });
    adminUpdateBookingStatusMock.mockResolvedValue({ status: "confirmed" });
    generateSlotsMock.mockReturnValue([new Date("2026-01-15T09:00:00.000Z")]);
  });

  it("renders calendar shell and page title", async () => {
    seedInitialFirestore();
    render(<CalendarPage />);

    expect(await screen.findByText("Kalendár")).toBeInTheDocument();
    expect(screen.getByTestId("booking-calendar-mock")).toBeInTheDocument();
    expect(screen.getByTestId("selectable-flag")).toHaveTextContent("true");
  });

  it("passes mapped events to BookingCalendar", async () => {
    seedInitialFirestore({ withEvent: true });
    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByTestId("events-count")).toHaveTextContent("1");
    });
    expect(bookingCalendarSpy.props?.events?.[0]?.title).toContain("Jana");
    expect(bookingCalendarSpy.props?.events?.[0]?.color).toBe("#22aa88");
  });

  it("opens booking modal when selecting slot as admin", async () => {
    seedInitialFirestore();
    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-slot"));
    expect(await screen.findByText("Nová rezervácia")).toBeInTheDocument();
  });

  it("disables selectability for non-admin user", async () => {
    businessState.value = {
      businessId: "biz-1",
      isOwnerOrAdmin: false,
      activeMembership: { profile_id: "profile-1" },
    };
    seedInitialFirestore({ employeeProfileId: "profile-1", nonAdmin: true });

    render(<CalendarPage />);
    expect(await screen.findByTestId("selectable-flag")).toHaveTextContent("false");
  });

  it("exports CSV for selected day when events exist", async () => {
    seedInitialFirestore({ withEvent: true });
    const createObjectURLMock = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();

    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
    const nativeCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click: clickMock } as any;
      }
      return nativeCreateElement(tag);
    });

    render(<CalendarPage />);
    const csvBtn = await screen.findByRole("button", { name: /CSV/i });
    fireEvent.click(csvBtn);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);

    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("opens print window and triggers print", async () => {
    seedInitialFirestore({ withEvent: true });
    const printWindowMock = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(printWindowMock as any);

    render(<CalendarPage />);
    fireEvent.click(await screen.findByRole("button", { name: /PDF \/ Tlač/i }));

    expect(openSpy).toHaveBeenCalled();
    expect(printWindowMock.document.write).toHaveBeenCalled();
    expect(printWindowMock.print).toHaveBeenCalled();
  });

  it("changes booking status from detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });

    render(<CalendarPage />);
    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Potvrdiť/i }));

    await waitFor(() => {
      expect(adminUpdateBookingStatusMock).toHaveBeenCalledWith({
        business_id: "biz-1",
        appointment_id: "apt-1",
        status: "confirmed",
      });
    });
  });

  it("shows validation error when creating booking without required fields", async () => {
    seedInitialFirestore();
    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-slot"));
    await screen.findByText("Nová rezervácia");
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť rezerváciu/i }));

    expect(toastMocks.error).toHaveBeenCalledWith("Vyplňte všetky polia");
    expect(firestoreMocks.addDocMock).not.toHaveBeenCalled();
  });

  it("shows print error toast when popup window is blocked", async () => {
    seedInitialFirestore({ withEvent: true });
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(<CalendarPage />);
    fireEvent.click(await screen.findByRole("button", { name: /PDF \/ Tlač/i }));

    expect(openSpy).toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith("Nepodarilo sa otvoriť tlačové okno");
  });

  it("saves note from detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });
    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.change(screen.getByPlaceholderText("Krátka interná poznámka k rezervácii"), {
      target: { value: "Nová interná poznámka" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť poznámku/i }));

    await waitFor(() => {
      expect(firestoreMocks.updateDocMock).toHaveBeenCalledWith(
        expect.objectContaining({ __collection: "appointments", id: "apt-1" }),
        expect.objectContaining({
          note: "Nová interná poznámka",
          updated_at: expect.any(String),
        }),
      );
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Poznámka uložená");
  });

  it("renders customer history items in detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });
    firestoreFixtures.customerHistory = [
      {
        id: "hist-1",
        start_at: "2026-01-10T08:00:00.000Z",
        status: "completed",
        service_name: "Masáž",
      },
      {
        id: "hist-2",
        start_at: "2026-01-11T09:30:00.000Z",
        status: "cancelled",
        service_name: "Farbenie",
      },
    ];

    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-event"));
    expect(await screen.findByText("História klienta")).toBeInTheDocument();
    expect(await screen.findByText("Masáž")).toBeInTheDocument();
    expect(screen.getByText("Farbenie")).toBeInTheDocument();
  });

  it("shows copied label after successful reference copy", async () => {
    seedInitialFirestore({ withEvent: true });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Skopírovať/i }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("apt-1");
    });
    expect(await screen.findByRole("button", { name: /Skopírované/i })).toBeInTheDocument();
  }, 15000);

  it("shows copy failure label when clipboard write fails", async () => {
    seedInitialFirestore({ withEvent: true });
    const writeTextMock = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Skopírovať/i }));

    expect(await screen.findByRole("button", { name: /Kópia zlyhala/i })).toBeInTheDocument();
  }, 15000);

  it("shows fallback title when service or employee labels are missing", async () => {
    const dayIso = new Date().toISOString().slice(0, 10);
    firestoreFixtures.appointments = [
      {
        id: "apt-fallback",
        customer_name: "Jana",
        service_name: null,
        employee_name: null,
        customer_email: "jana@example.com",
        customer_phone: "+421900000111",
        customer_id: "cust-1",
        start_at: `${dayIso}T09:00:00.000Z`,
        end_at: `${dayIso}T09:30:00.000Z`,
        status: "pending",
      },
    ];

    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-event"));
    expect(await screen.findByText("Jana – Služba")).toBeInTheDocument();
  });

  it("shows error toast when saving note fails", async () => {
    seedInitialFirestore({ withEvent: true });
    firestoreMocks.updateDocMock.mockRejectedValueOnce(new Error("save failed"));

    render(<CalendarPage />);

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.change(screen.getByPlaceholderText("Krátka interná poznámka k rezervácii"), {
      target: { value: "Nepodarilo sa uložiť" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť poznámku/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Chyba pri ukladaní poznámky");
    });
  });
});
