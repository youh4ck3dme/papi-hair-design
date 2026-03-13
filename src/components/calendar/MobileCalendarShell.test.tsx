import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MobileCalendarShell from "./MobileCalendarShell";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

const callableMocks = vi.hoisted(() => ({
  listProviders: vi.fn(),
  createPublicBooking: vi.fn(),
}));

const fixtures = vi.hoisted(() => ({
  providers: [] as any[],
  services: [] as any[],
  businessHours: [] as any[],
  schedules: [] as any[],
  overrides: [] as any[],
  appointments: [] as any[],
  customersByEmail: [] as any[],
  servicesByName: [] as any[],
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
  functions: {},
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: (_functions: unknown, name: string) => {
    if (name === "listBookableProviders") return callableMocks.listProviders;
    if (name === "createPublicBooking") return callableMocks.createPublicBooking;
    return vi.fn();
  },
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ __collection: name, constraints: [] }),
    where: (field: string, op: string, value: unknown) => ({ type: "where", field, op, value }),
    orderBy: (field: string, direction?: string) => ({ type: "orderBy", field, direction }),
    query: (base: any, ...constraints: any[]) => ({
      __collection: base?.__collection ?? "unknown",
      constraints: [...(base?.constraints ?? []), ...constraints],
    }),
    doc: (_db: unknown, name: string, id: string) => ({ __collection: name, id }),
    getDocs: firestoreMocks.getDocs,
    addDoc: firestoreMocks.addDoc,
    updateDoc: firestoreMocks.updateDoc,
    getDoc: vi.fn(),
  };
});

vi.mock("./GlassHeader", () => ({
  default: (props: any) => (
    <div data-testid="glass-header">
      <button onClick={props.onPrev}>prev</button>
      <button onClick={props.onNext}>next</button>
      <button onClick={props.onToday}>today</button>
      <button onClick={() => props.onViewChange("month")}>header-month</button>
      <button onClick={() => props.onViewChange("week")}>header-week</button>
      <button onClick={() => props.onViewChange("day")}>header-day</button>
    </div>
  ),
}));

vi.mock("./mobile/EmployeeFilter", () => ({
  default: (props: any) => (
    <div data-testid="employee-filter">
      <span data-testid="selected-employee-count">{String(props.selectedEmployeeIds.length)}</span>
      <button onClick={props.onSelectAll}>select-all</button>
      <button onClick={() => props.onToggle(props.employees[0]?.id)}>toggle-first</button>
    </div>
  ),
}));

vi.mock("./mobile/CalendarToolbar", () => ({
  default: (props: any) => (
    <div data-testid="calendar-toolbar">
      <button onClick={props.onAddReservation}>toolbar-add</button>
      <button onClick={props.onBlockTime}>toolbar-block</button>
      <button onClick={props.onRefresh}>toolbar-refresh</button>
      <button onClick={props.onToday}>toolbar-today</button>
      <button onClick={() => props.onViewChange("month")}>toolbar-month</button>
      <button onClick={() => props.onViewChange("week")}>toolbar-week</button>
      <button onClick={() => props.onViewChange("day")}>toolbar-day</button>
      <span data-testid="toolbar-refreshing">{String(Boolean(props.refreshing))}</span>
    </div>
  ),
}));

vi.mock("./mobile/CalendarGrid", () => ({
  default: (props: any) => (
    <div data-testid="calendar-grid">
      <span data-testid="grid-event-count">{String(props.events?.length ?? 0)}</span>
      <button onClick={() => props.onSlotClick("emp-1", new Date("2026-01-15T09:00:00.000Z"), false)}>
        grid-slot-blocked
      </button>
      <button onClick={() => props.onSlotClick("emp-1", new Date("2026-01-15T09:30:00.000Z"), true)}>
        grid-slot-open
      </button>
      <button onClick={() => props.onEventClick(props.events?.[0])}>grid-open-first-event</button>
    </div>
  ),
}));

vi.mock("./MonthGrid", () => ({
  default: (props: any) => (
    <div data-testid="month-grid">
      <button onClick={() => props.onDayClick(new Date("2026-01-16T09:00:00.000Z"))}>month-day</button>
    </div>
  ),
}));

vi.mock("./WeekTimeline", () => ({
  default: (props: any) => (
    <div data-testid="week-timeline">
      <button onClick={() => props.onDayClick(new Date("2026-01-17T09:00:00.000Z"))}>week-day</button>
      <button onClick={() => props.onTapAppointment(props.appointments?.[0])}>week-open-first</button>
    </div>
  ),
}));

vi.mock("@/components/booking/QuickBookingSheet", () => ({
  default: (props: any) => (
    <div data-testid="quick-booking-sheet">
      <span data-testid="quick-booking-open">{String(Boolean(props.open))}</span>
      <button
        onClick={() =>
          props.onSubmit?.({
            service_id: "svc-1",
            employee_id: "emp-1",
            start_at: "2026-01-15T09:30:00.000Z",
            customer_name: "Jana",
            customer_email: "jana@example.com",
          })?.catch(() => {})
        }
      >
        booking-submit
      </button>
    </div>
  ),
}));

vi.mock("@/components/booking/BlockTimeSheet", () => ({
  default: (props: any) => (
    <div data-testid="block-time-sheet">
      <span data-testid="block-time-open">{String(Boolean(props.open))}</span>
      <button
        onClick={() =>
          props.onSubmit?.({
            employee_id: "emp-1",
            start_at: "2026-01-15T11:00:00.000Z",
            end_at: "2026-01-15T12:00:00.000Z",
            reason: "Obed",
          })?.catch(() => {})
        }
      >
        block-submit
      </button>
    </div>
  ),
}));

vi.mock("@/components/booking/AppointmentDetailSheet", () => ({
  default: (props: any) => (
    <div data-testid="appointment-detail-sheet">
      <span data-testid="detail-open">{String(Boolean(props.open))}</span>
      <button onClick={() => props.onCancel?.(props.appointment?.id)}>detail-cancel</button>
      <button onClick={() => props.onMarkArrived?.(props.appointment?.id)}>detail-arrived</button>
    </div>
  ),
}));

function makeSnapshot(items: any[]) {
  return {
    empty: items.length === 0,
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
  };
}

function hasWhere(input: any, field: string, value?: unknown): boolean {
  return (input?.constraints ?? []).some(
    (item: any) => item?.type === "where" && item.field === field && (value === undefined || item.value === value),
  );
}

describe("MobileCalendarShell", () => {
  beforeEach(() => {
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    toastMocks.warning.mockReset();
    toastMocks.info.mockReset();
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.addDoc.mockReset();
    firestoreMocks.updateDoc.mockReset();
    callableMocks.listProviders.mockReset();
    callableMocks.createPublicBooking.mockReset();

    fixtures.providers = [
      { id: "emp-1", display_name: "Marek", is_active: true },
      { id: "emp-2", display_name: "Lucia", is_active: true },
    ];
    fixtures.services = [{ id: "svc-1", name_sk: "Strih", duration_minutes: 30, price: 20, is_active: true }];
    fixtures.businessHours = [{ id: "bh-1", day_of_week: "monday", sort_order: 1 }];
    fixtures.schedules = [{ id: "sch-1", employee_id: "emp-1", day_of_week: "monday", start_time: "08:00", end_time: "16:00" }];
    fixtures.overrides = [];
    fixtures.customersByEmail = [];
    fixtures.servicesByName = [];
    fixtures.appointments = [
      {
        id: "apt-1",
        start_at: "2026-01-15T09:00:00.000Z",
        end_at: "2026-01-15T09:30:00.000Z",
        status: "confirmed",
        employee_id: "emp-1",
        notes: null,
        services: { name_sk: "Strih" },
        employees: { display_name: "Marek" },
        customers: { full_name: "Jana" },
      },
    ];

    callableMocks.listProviders.mockResolvedValue({ data: fixtures.providers });
    callableMocks.createPublicBooking.mockResolvedValue({ data: { success: true } });

    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;
      if (collectionName === "services") {
        if (hasWhere(input, "name_sk")) return makeSnapshot(fixtures.servicesByName);
        return makeSnapshot(fixtures.services);
      }
      if (collectionName === "business_hours") return makeSnapshot(fixtures.businessHours);
      if (collectionName === "schedules") return makeSnapshot(fixtures.schedules);
      if (collectionName === "business_date_overrides") return makeSnapshot(fixtures.overrides);
      if (collectionName === "appointments") return makeSnapshot(fixtures.appointments);
      if (collectionName === "customers") return makeSnapshot(fixtures.customersByEmail);
      return makeSnapshot([]);
    });

    firestoreMocks.addDoc.mockImplementation(async (target: any) => {
      const name = target?.__collection;
      if (name === "customers") return { id: "cust-new" };
      if (name === "services") return { id: "svc-new" };
      if (name === "appointments") return { id: "apt-new" };
      return { id: "doc-new" };
    });
    firestoreMocks.updateDoc.mockResolvedValue(undefined);
  });

  it("loads data and renders day grid with mapped events", async () => {
    render(<MobileCalendarShell />);

    expect(await screen.findByTestId("calendar-grid")).toBeInTheDocument();
    expect(screen.getByTestId("selected-employee-count")).toHaveTextContent("2");
    expect(screen.getByTestId("grid-event-count")).toHaveTextContent("1");
  });

  it("opens quick booking from toolbar and from bookable slot", async () => {
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");

    fireEvent.click(screen.getByText("toolbar-add"));
    await waitFor(() => expect(screen.getByTestId("quick-booking-open")).toHaveTextContent("true"));

    fireEvent.click(screen.getByText("grid-slot-open"));
    await waitFor(() => expect(screen.getByTestId("quick-booking-open")).toHaveTextContent("true"));
  });

  it("warns and keeps booking sheet closed for non-bookable slot", async () => {
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");

    fireEvent.click(screen.getByText("grid-slot-blocked"));
    expect(toastMocks.warning).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("quick-booking-open")).toHaveTextContent("false");
  });

  it("submits booking through cloud function and refreshes appointments", async () => {
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");

    fireEvent.click(screen.getByText("booking-submit"));

    await waitFor(() => expect(callableMocks.createPublicBooking).toHaveBeenCalledTimes(1));
    expect(toastMocks.success).toHaveBeenCalledWith("Rezervácia vytvorená!");
  });

  it("shows error when booking callable reports failure", async () => {
    callableMocks.createPublicBooking.mockResolvedValueOnce({ data: { success: false, error: "Busy" } });
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");

    fireEvent.click(screen.getByText("booking-submit"));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalled());
  });

  it("creates block customer and service when missing, then creates blocked appointment", async () => {
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");

    fireEvent.click(screen.getByText("toolbar-block"));
    await waitFor(() => expect(screen.getByTestId("block-time-open")).toHaveTextContent("true"));

    fireEvent.click(screen.getByText("block-submit"));

    await waitFor(() => expect(firestoreMocks.addDoc).toHaveBeenCalled());
    const addTargets = firestoreMocks.addDoc.mock.calls.map((call) => call[0]?.__collection);
    expect(addTargets).toContain("customers");
    expect(addTargets).toContain("services");
    expect(addTargets).toContain("appointments");
    expect(toastMocks.success).toHaveBeenCalledWith("Blokovaný čas uložený");
  });

  it("shows blocked-info toast when blocked appointment is tapped", async () => {
    fixtures.appointments = [
      {
        id: "apt-block",
        start_at: "2026-01-15T10:00:00.000Z",
        end_at: "2026-01-15T10:30:00.000Z",
        status: "confirmed",
        employee_id: "emp-1",
        notes: "[BLOCK] Porada",
        services: { name_sk: "Interné" },
        employees: { display_name: "Marek" },
        customers: { full_name: "Interné" },
      },
    ];

    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");
    fireEvent.click(screen.getByText("grid-open-first-event"));

    expect(toastMocks.info).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("detail-open")).toHaveTextContent("false");
  });

  it("opens detail for reservation and supports cancel + arrived actions", async () => {
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");
    fireEvent.click(screen.getByText("grid-open-first-event"));

    await waitFor(() => expect(screen.getByTestId("detail-open")).toHaveTextContent("true"));

    fireEvent.click(screen.getByText("detail-cancel"));
    await waitFor(() => {
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ __collection: "appointments", id: "apt-1" }),
        expect.objectContaining({ status: "cancelled" }),
      );
    });

    fireEvent.click(screen.getByText("detail-arrived"));
    await waitFor(() => {
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ __collection: "appointments", id: "apt-1" }),
        expect.objectContaining({ status: "completed" }),
      );
    });
  });

  it("switches between month/week/day views", async () => {
    render(<MobileCalendarShell />);
    await screen.findByTestId("calendar-grid");

    fireEvent.click(screen.getByText("toolbar-month"));
    expect(await screen.findByTestId("month-grid")).toBeInTheDocument();

    fireEvent.click(screen.getByText("toolbar-week"));
    expect(await screen.findByTestId("week-timeline")).toBeInTheDocument();

    fireEvent.click(screen.getByText("toolbar-day"));
    expect(await screen.findByTestId("calendar-grid")).toBeInTheDocument();
  });
});
