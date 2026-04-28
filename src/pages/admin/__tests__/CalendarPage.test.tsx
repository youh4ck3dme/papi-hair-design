import { Children, isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CalendarPage from "../CalendarPage";
import { SidebarProvider } from "@/components/ui/sidebar";

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

function createFirestoreTestMocks() {
  return {
    getDocsMock: vi.fn(),
    getDocMock: vi.fn(),
    addDocMock: vi.fn(),
    updateDocMock: vi.fn(),
  };
}

function createFirestoreTestFixtures() {
  return {
    appointments: [] as any[],
    employeeLookup: [] as any[],
    services: [] as any[],
    employees: [] as any[],
    memberships: [] as any[],
    schedules: [] as any[],
    customerHistory: [] as any[],
  };
}

const firestoreMocks = vi.hoisted(createFirestoreTestMocks);
const firestoreFixtures = vi.hoisted(createFirestoreTestFixtures);

const adminUpdateBookingStatusMock = vi.hoisted(() => vi.fn());
const adminCalendarQuickActionMock = vi.hoisted(() => vi.fn());
const printHtmlDocumentMock = vi.hoisted(() => vi.fn(() => true));
const generateSlotsMock = vi.hoisted(() => vi.fn());
const calendarEventUtilsMocks = vi.hoisted(() => ({
  toCalendarWallClockDate: vi.fn(),
  fromCalendarWallClockDateToUtcIso: vi.fn(),
  getBusinessDayUtcRange: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
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
        <div data-testid="booking-calendar-actions">{props.headerActions}</div>
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
          onClick={() =>
            props.onLongPressSlot?.({
              start: new Date("2026-01-15T09:00:00.000Z"),
              end: new Date("2026-01-15T09:30:00.000Z"),
              resourceId: "emp-1",
              resourceName: "Marek",
            })
          }
        >
          longpress-slot
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
        <button
          type="button"
          onClick={() => {
            const first = props.events?.[0];
            if (first) props.onLongPressEvent?.(first);
          }}
        >
          longpress-event
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
vi.mock("@/integrations/firebase/adminCalendarQuickAction", () => ({
  adminCalendarQuickAction: adminCalendarQuickActionMock,
}));
vi.mock("@/lib/adminCalendarPrint", () => ({
  printHtmlDocument: printHtmlDocumentMock,
}));

vi.mock("@/lib/availability", () => ({
  generateSlots: generateSlotsMock,
}));

vi.mock("@/lib/calendarEventUtils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/calendarEventUtils")>("@/lib/calendarEventUtils");
  calendarEventUtilsMocks.toCalendarWallClockDate.mockImplementation(actual.toCalendarWallClockDate);
  calendarEventUtilsMocks.fromCalendarWallClockDateToUtcIso.mockImplementation(actual.fromCalendarWallClockDateToUtcIso);
  calendarEventUtilsMocks.getBusinessDayUtcRange.mockImplementation(actual.getBusinessDayUtcRange);
  return {
    ...actual,
    toCalendarWallClockDate: calendarEventUtilsMocks.toCalendarWallClockDate,
    fromCalendarWallClockDateToUtcIso: calendarEventUtilsMocks.fromCalendarWallClockDateToUtcIso,
    getBusinessDayUtcRange: calendarEventUtilsMocks.getBusinessDayUtcRange,
  };
});

function collectSelectItems(node: unknown): Array<{ value: string; label: string }> {
  const items: Array<{ value: string; label: string }> = [];

  Children.forEach(node as any, (child) => {
    if (!isValidElement(child)) return;

    if (typeof child.props?.value === "string") {
      const label = Children.toArray(child.props.children).join("").trim();
      items.push({ value: child.props.value, label });
      return;
    }

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
    const values = items.map((item) => item.value);
    const isServiceSelect = values.some((value) => value.startsWith("svc-"));
    const isStatusSelect = ["pending", "confirmed", "completed", "no_show", "cancelled"].some((value) =>
      values.includes(value),
    );
    const label = isServiceSelect ? "service-select" : isStatusSelect ? "status-select" : "employee-select";

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
      <span>{children}</span>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span data-select-placeholder>{placeholder ?? null}</span>,
}));

vi.mock("sonner", () => ({ toast: toastMocks }));

function mergeQueryConstraints(base: any, constraints: any[]) {
  const inherited = Array.isArray(base?.constraints) ? base.constraints : [];
  const collection = typeof base?.__collection === "string" ? base.__collection : "unknown";
  return {
    __collection: collection,
    constraints: inherited.concat(constraints),
  };
}

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  class LocalTimestamp {
    private readonly value: Date;

    constructor(value: Date) {
      this.value = value;
    }

    toDate() {
      return this.value;
    }
  }

  return Object.assign({}, actual, {
    collection: (_db: unknown, name: string) => ({ __collection: name, constraints: [] }),
    where: (field: string, op: string, value: unknown) => ({ type: "where", field, op, value }),
    orderBy: (field: string, direction: string) => ({ type: "orderBy", field, direction }),
    limit: (value: number) => ({ type: "limit", value }),
    query: (base: any, ...constraints: any[]) => mergeQueryConstraints(base, constraints),
    doc: (_db: unknown, name: string, id: string) => ({ __collection: name, id }),
    getDocs: firestoreMocks.getDocsMock,
    getDoc: firestoreMocks.getDocMock,
    addDoc: firestoreMocks.addDocMock,
    updateDoc: firestoreMocks.updateDocMock,
    Timestamp: LocalTimestamp,
  });
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

function localDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seedInitialFirestore(options?: {
  withEvent?: boolean;
  employeeProfileId?: string | null;
  nonAdmin?: boolean;
}) {
  const withEvent = options?.withEvent ?? false;
  const employeeProfileId = options?.employeeProfileId ?? "profile-1";
  const nonAdmin = options?.nonAdmin ?? false;
  const dayIso = localDateIso();

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

function renderCalendarPage() {
  return render(
    <SidebarProvider>
      <CalendarPage />
    </SidebarProvider>,
  );
}

async function withMockedMatchMedia(
  matches: (query: string) => boolean,
  run: () => Promise<void>
) {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  try {
    await run();
  } finally {
    window.matchMedia = originalMatchMedia;
  }
}

async function clickPrintToolbarButton(container: HTMLElement) {
  await waitFor(() => {
    expect(screen.getByTestId("events-count")).toHaveTextContent("1");
  });
  const printIcon = container.querySelector("svg.lucide-printer");
  const printButton = printIcon?.closest("button");
  expect(printButton).toBeTruthy();
  fireEvent.click(printButton!);
}

async function expectCreatedAppointmentRange(startAtIso: string, endAtIso: string) {
  await waitFor(() => {
    expect(firestoreMocks.addDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "appointments", constraints: [] }),
      expect.objectContaining({
        start_at: startAtIso,
        end_at: endAtIso,
      }),
    );
  });
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
    adminCalendarQuickActionMock.mockReset();
    printHtmlDocumentMock.mockReset();
    printHtmlDocumentMock.mockReturnValue(true);
    generateSlotsMock.mockReset();
    calendarEventUtilsMocks.toCalendarWallClockDate.mockClear();
    calendarEventUtilsMocks.fromCalendarWallClockDateToUtcIso.mockClear();
    calendarEventUtilsMocks.getBusinessDayUtcRange.mockClear();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    toastMocks.warning.mockReset();
    window.localStorage.clear();

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
    adminCalendarQuickActionMock.mockResolvedValue({ success: true });
    generateSlotsMock.mockReturnValue([new Date("2026-01-15T09:00:00.000Z")]);
  });

  it("renders calendar shell and page title", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    expect(await screen.findByTestId("booking-calendar-mock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Toggle Sidebar/i })).toBeInTheDocument();
    expect(screen.getByTestId("selectable-flag")).toHaveTextContent("true");
  });

  it("passes mapped events to BookingCalendar", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByTestId("events-count")).toHaveTextContent("1");
    });
    expect(bookingCalendarSpy.props?.events?.[0]?.title).toContain("Jana");
    expect(bookingCalendarSpy.props?.events?.[0]?.color).toBe("#22aa88");
  });

  it("does not trigger an infinite reload loop after employees state hydration", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByTestId("events-count")).toHaveTextContent("1");
    });

    await waitFor(() => {
      const appointmentsCalls = firestoreMocks.getDocsMock.mock.calls.filter(
        ([input]) => input?.__collection === "appointments",
      ).length;
      expect(appointmentsCalls).toBeLessThanOrEqual(3);
    });
  });

  it("keeps calendar containers overflow-safe on mobile widths", async () => {
    seedInitialFirestore({ withEvent: true });
    const { container } = renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByTestId("events-count")).toHaveTextContent("1");
    });

    const root = container.querySelector(".calendar-page-root");
    const shell = container.querySelector(".calendar-page-shell");
    expect(root).toHaveClass("overflow-x-hidden");
    expect(shell).toHaveClass("overflow-x-hidden");
  });

  it("keeps role-based employee visibility for non-admin users", async () => {
    businessState.value = {
      businessId: "biz-1",
      isOwnerOrAdmin: false,
      activeMembership: { profile_id: "profile-1" },
    };

    seedInitialFirestore({ withEvent: true, employeeProfileId: "profile-1", nonAdmin: true });
    firestoreFixtures.employees = [
      { id: "emp-1", display_name: "Marek", is_active: true, profile_id: "profile-1", color: "#123456" },
      { id: "emp-2", display_name: "Nika", is_active: true, profile_id: "profile-2", color: "#999999" },
    ];

    renderCalendarPage();

    await waitFor(() => {
      expect(bookingCalendarSpy.props?.resources).toHaveLength(1);
    });
    expect(bookingCalendarSpy.props?.resources?.[0]?.id).toBe("emp-1");
  });

  it("filters larger datasets by status without instability", async () => {
    const dayIso = localDateIso();
    firestoreFixtures.appointments = Array.from({ length: 80 }, (_, index) => ({
      id: `apt-${index}`,
      customer_name: `Customer ${index}`,
      service_name: "Strih",
      employee_name: "Marek",
      employee_color: "#22aa88",
      customer_email: `user${index}@example.com`,
      customer_phone: `+42190000${index}`,
      customer_id: `cust-${index}`,
      start_at: `${dayIso}T09:${String(index % 60).padStart(2, "0")}:00.000Z`,
      end_at: `${dayIso}T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
      status: index % 2 === 0 ? "confirmed" : "pending",
    }));
    firestoreFixtures.services = [{ id: "svc-1", name_sk: "Strih", duration_minutes: 30, buffer_minutes: 0, price: 20 }];
    firestoreFixtures.employees = [{ id: "emp-1", display_name: "Marek", is_active: true, profile_id: "profile-1", color: "#123456" }];
    firestoreFixtures.memberships = [{ profile_id: "profile-1", role: "owner" }];
    firestoreFixtures.schedules = [{ employee_id: "emp-1", day_of_week: "monday", start_time: "08:00", end_time: "16:00" }];

    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByTestId("events-count")).toHaveTextContent("80");
    });

    fireEvent.change(screen.getByLabelText("status-select"), { target: { value: "confirmed" } });

    await waitFor(() => {
      expect(screen.getByTestId("events-count")).toHaveTextContent("40");
    });
  });

  it("renders calendar action buttons in exact order", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    const actions = await screen.findByTestId("booking-calendar-actions");
    const labels = Array.from(actions.querySelectorAll("button")).map((button) =>
      button.textContent?.trim(),
    );

    expect(labels).toEqual(["Dnes", "Blokácia", "Nová rezervácia"]);
  });

  it("defaults to day view on mobile widths", async () => {
    await withMockedMatchMedia(
      (query) => query === "(max-width: 767px)",
      async () => {
      seedInitialFirestore({ withEvent: true });
      renderCalendarPage();

      await screen.findByTestId("booking-calendar-mock");
      expect(bookingCalendarSpy.props?.mode).toBe("day");
      }
    );
  });

  it("clicking Dnes jumps calendar to current day view", async () => {
    await withMockedMatchMedia(
      () => false,
      async () => {
      seedInitialFirestore({ withEvent: true });
      renderCalendarPage();

      await screen.findByTestId("booking-calendar-mock");
      fireEvent.click(screen.getByRole("button", { name: "Dnes" }));
      await waitFor(() => {
        expect(bookingCalendarSpy.props?.mode).toBe("day");
      });
      expect(bookingCalendarSpy.props?.date).toBeInstanceOf(Date);
      }
    );
  });

  it("opens block dialog from toolbar action", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    fireEvent.click((await screen.findByTestId("booking-calendar-actions")).querySelectorAll("button")[1]);
    expect(await screen.findByRole("heading", { name: "Blokovať čas" })).toBeInTheDocument();
  });

  it("opens booking modal from toolbar action", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    fireEvent.click((await screen.findByTestId("booking-calendar-actions")).querySelectorAll("button")[2]);
    expect(await screen.findByRole("heading", { name: "Nová rezervácia" })).toBeInTheDocument();
  });

  it("opens booking modal when selecting slot as admin", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-slot"));
    expect(await screen.findByRole("heading", { name: "Nová rezervácia" })).toBeInTheDocument();
  });

  it("opens long press create menu for free slot and routes reservation action into existing booking flow", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    fireEvent.click(await screen.findByText("longpress-slot"));
    expect(await screen.findByRole("heading", { name: "Udalosť" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rezervácia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blokovanie času" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rezervácia" }));
    expect(await screen.findByRole("heading", { name: "Nová rezervácia" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("employee-select")[1]).toHaveValue("emp-1");
  });

  it("opens long press create menu for free slot and routes block action into existing block flow", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    fireEvent.click(await screen.findByText("longpress-slot"));
    fireEvent.click(await screen.findByRole("button", { name: "Blokovanie času" }));

    expect(await screen.findByRole("heading", { name: "Blokovať čas" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("employee-select")[1]).toHaveValue("emp-1");
  });

  it("disables selectability for non-admin user", async () => {
    businessState.value = {
      businessId: "biz-1",
      isOwnerOrAdmin: false,
      activeMembership: { profile_id: "profile-1" },
    };
    seedInitialFirestore({ employeeProfileId: "profile-1", nonAdmin: true });

    renderCalendarPage();
    expect(await screen.findByTestId("selectable-flag")).toHaveTextContent("false");
  });

  it("keeps toolbar actions available for employee-scoped calendar", async () => {
    businessState.value = {
      businessId: "biz-1",
      isOwnerOrAdmin: false,
      activeMembership: { profile_id: "profile-1" },
    };
    seedInitialFirestore({ employeeProfileId: "profile-1", nonAdmin: true });

    renderCalendarPage();

    const actions = await screen.findByTestId("booking-calendar-actions");
    expect(within(actions).getByRole("button", { name: "Dnes" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "Blokácia" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "Nová rezervácia" })).toBeInTheDocument();
  });

  it("exports CSV for selected day when events exist", async () => {
    seedInitialFirestore({ withEvent: true });
    const clickMock = vi.fn();
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickMock as any);

    try {
      renderCalendarPage();
      await waitFor(() => {
        expect(screen.getByTestId("events-count")).toHaveTextContent("1");
      });
      const csvBtn = await screen.findByRole("button", { name: /CSV/i });
      fireEvent.click(csvBtn);

      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(anchorClickSpy.mock.instances[0]?.href).toContain("data:text/csv;charset=utf-8,");
    } finally {
      anchorClickSpy.mockRestore();
    }
  });

  it("builds printable HTML through the print helper", async () => {
    seedInitialFirestore({ withEvent: true });

    const { container } = renderCalendarPage();
    await clickPrintToolbarButton(container);

    expect(printHtmlDocumentMock).toHaveBeenCalledTimes(1);
    expect(String(printHtmlDocumentMock.mock.calls[0][0])).toContain("PAPI HAIR DESIGN - Denný prehľad");
  });

  it("changes booking status from detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });

    renderCalendarPage();
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

  it("opens long press manage menu for occupied event and detail action shows existing detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    fireEvent.click(await screen.findByText("longpress-event"));
    expect(await screen.findByRole("heading", { name: "Udalosť" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Detail" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upraviť" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zrušiť" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Detail" }));
    expect(await screen.findByRole("heading", { name: "Detail rezervácie" })).toBeInTheDocument();
  });

  it("opens move quick action from occupied event long press edit action", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    fireEvent.click(await screen.findByText("longpress-event"));
    fireEvent.click(await screen.findByRole("button", { name: "Upraviť" }));

    expect(await screen.findByRole("heading", { name: "Presun termínu" })).toBeInTheDocument();
  });

  it("runs cancel flow from occupied event long press action", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    fireEvent.click(await screen.findByText("longpress-event"));
    fireEvent.click(await screen.findByRole("button", { name: "Zrušiť" }));

    await waitFor(() => {
      expect(adminUpdateBookingStatusMock).toHaveBeenCalledWith({
        business_id: "biz-1",
        appointment_id: "apt-1",
        status: "cancelled",
      });
    });
  });

  it("renders appointment detail time in business timezone instead of browser local offset", async () => {
    useBusinessInfoState.value = {
      info: {
        business: { allow_admin_as_provider: true, opening_hours: {}, timezone: "Europe/Bratislava" },
        hours: [],
        overrides: [],
      },
      loading: false,
    };
    firestoreFixtures.appointments = [
      {
        id: "apt-tz",
        customer_name: "Jana",
        service_name: "Strih",
        employee_name: "Marek",
        employee_color: "#22aa88",
        customer_email: "jana@example.com",
        customer_phone: "+421900000111",
        customer_id: "cust-1",
        start_at: "2026-01-15T11:00:00.000Z",
        end_at: "2026-01-15T11:30:00.000Z",
        status: "pending",
      },
    ];

    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-event"));
    expect(await screen.findByText("15. 1. 2026 12:00 – 12:30")).toBeInTheDocument();
  });

  it("stores newly created slot in business timezone UTC, not browser local UTC", async () => {
    useBusinessInfoState.value = {
      info: {
        business: { allow_admin_as_provider: true, opening_hours: {}, timezone: "Europe/Bratislava" },
        hours: [],
        overrides: [],
      },
      loading: false,
    };
    seedInitialFirestore();

    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-slot"));
    await screen.findByRole("heading", { name: "Nová rezervácia" });

    fireEvent.change(screen.getByLabelText("service-select"), { target: { value: "svc-1" } });
    fireEvent.change(screen.getAllByLabelText("employee-select")[1], { target: { value: "emp-1" } });

    calendarEventUtilsMocks.fromCalendarWallClockDateToUtcIso
      .mockReturnValueOnce("2026-01-15T08:00:00.000Z")
      .mockReturnValueOnce("2026-01-15T08:30:00.000Z");

    await waitFor(() => {
      expect(generateSlotsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť rezerváciu/i }));

    await expectCreatedAppointmentRange("2026-01-15T08:00:00.000Z", "2026-01-15T08:30:00.000Z");
    expect(calendarEventUtilsMocks.fromCalendarWallClockDateToUtcIso).toHaveBeenCalledTimes(2);
  });

  it("shows validation error when creating booking without required fields", async () => {
    seedInitialFirestore();
    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-slot"));
    await screen.findByRole("heading", { name: "Nová rezervácia" });
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť rezerváciu/i }));

    expect(toastMocks.error).toHaveBeenCalledWith("Vyplňte všetky polia");
    expect(firestoreMocks.addDocMock).not.toHaveBeenCalled();
  });

  it("shows print error toast when print helper cannot prepare the document", async () => {
    seedInitialFirestore({ withEvent: true });
    printHtmlDocumentMock.mockReturnValue(false);

    const { container } = renderCalendarPage();
    await clickPrintToolbarButton(container);

    expect(printHtmlDocumentMock).toHaveBeenCalledTimes(1);
    expect(toastMocks.error).toHaveBeenCalledWith("Nepodarilo sa pripraviť tlač");
  });

  it("saves note from detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.change(await screen.findByPlaceholderText(/Interná poznámka k rezervácii/i), {
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

    renderCalendarPage();

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

    renderCalendarPage();

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

    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Skopírovať/i }));

    expect(await screen.findByRole("button", { name: /Kópia zlyhala/i })).toBeInTheDocument();
  }, 15000);

  it("shows fallback title when service or employee labels are missing", async () => {
    const dayIso = localDateIso();
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

    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-event"));
    expect(await screen.findByText("Jana – Služba")).toBeInTheDocument();
  });

  it("shows error toast when saving note fails", async () => {
    seedInitialFirestore({ withEvent: true });
    firestoreMocks.updateDocMock.mockRejectedValueOnce(new Error("save failed"));

    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.change(await screen.findByPlaceholderText(/Interná poznámka k rezervácii/i), {
      target: { value: "Nepodarilo sa uložiť" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť poznámku/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Chyba pri ukladaní poznámky");
    });
  });

  it("submits move quick action from detail sheet", async () => {
    seedInitialFirestore({ withEvent: true });
    renderCalendarPage();

    fireEvent.click(await screen.findByText("open-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Presunúť/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Uložiť$/i }));

    await waitFor(() => {
      expect(adminCalendarQuickActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: "biz-1",
          action: "move",
          event_type: "appointment",
          appointment_id: "apt-1",
        }),
      );
    });
  });
});
