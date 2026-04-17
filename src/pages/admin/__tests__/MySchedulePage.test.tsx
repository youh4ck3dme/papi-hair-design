import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MySchedulePage from "../MySchedulePage";

const businessState = vi.hoisted(() => ({
  value: {
    businessId: "biz-1",
  },
}));

const businessInfoState = vi.hoisted(() => ({
  value: {
    info: {
      business: { timezone: "Europe/Bratislava" },
      hours: [],
      overrides: [],
    },
  },
}));

const authState = vi.hoisted(() => ({
  value: {
    user: { id: "user-1", email: "miska@papihairdesign.sk" },
    profile: { full_name: "Miška" },
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
  deleteDocMock: vi.fn(),
}));

const firestoreFixtures = vi.hoisted(() => ({
  employeesForUser: [] as any[],
  fallbackEmployees: [] as any[],
  appointments: [] as any[],
  timeBlocks: [] as any[],
  services: [] as any[],
  docsByPath: {} as Record<string, any>,
}));

const adminCalendarQuickActionMock = vi.hoisted(() => vi.fn());

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("@/hooks/useBusinessInfo", () => ({
  useBusinessInfo: () => businessInfoState.value,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState.value,
}));

vi.mock("@/components/booking-calendar", () => ({
  statusToColor: (status: string) => status,
  BookingCalendar: (props: any) => {
    bookingCalendarSpy.props = props;
    return (
      <div data-testid="my-schedule-calendar">
        <div data-testid="my-schedule-actions">{props.headerActions}</div>
        <div data-testid="my-schedule-events">{String(props.events?.length ?? 0)}</div>
        <div data-testid="my-schedule-first-title">{props.events?.[0]?.title ?? ""}</div>
        <div data-testid="my-schedule-mode">{props.mode}</div>
        <button
          type="button"
          onClick={() =>
            props.onSelectSlot?.({
              start: new Date(2026, 0, 15, 9, 0, 0, 0),
              end: new Date(2026, 0, 15, 9, 30, 0, 0),
              resourceId: "emp-1",
              resourceName: "Miska",
              intent: "book",
            })
          }
        >
          open-schedule-slot
        </button>
        <button
          type="button"
          onClick={() =>
            props.onSelectSlot?.({
              start: new Date(2026, 0, 15, 9, 0, 0, 0),
              end: new Date(2026, 0, 15, 9, 30, 0, 0),
              resourceId: "emp-1",
              resourceName: "Miska",
              intent: "block",
            })
          }
        >
          open-schedule-block-slot
        </button>
        <button
          type="button"
          onClick={() => {
            const firstEvent = props.events?.[0];
            if (firstEvent) {
              props.onSelectEvent?.(firstEvent);
            }
          }}
        >
          open-schedule-event
        </button>
      </div>
    );
  },
}));

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
}));

vi.mock("@/integrations/firebase/adminCalendarQuickAction", () => ({
  adminCalendarQuickAction: adminCalendarQuickActionMock,
}));

vi.mock("@/integrations/firebase/callableError", () => ({
  toCallableErrorMessage: (error: any, fallback: string) => error?.message ?? fallback,
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
    orderBy: (field: string, direction?: string) => ({ type: "orderBy", field, direction }),
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
    deleteDoc: firestoreMocks.deleteDocMock,
  };
});

function makeSnapshot(items: any[]) {
  return {
    empty: items.length === 0,
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
  };
}

function hasWhere(input: any, field: string): boolean {
  return (input?.constraints ?? []).some((constraint: any) => constraint?.type === "where" && constraint?.field === field);
}

function seedScheduleFirestore(options?: {
  employeesForUser?: any[];
  fallbackEmployees?: any[];
  appointments?: any[];
  timeBlocks?: any[];
  services?: any[];
  docsByPath?: Record<string, any>;
}) {
  firestoreFixtures.employeesForUser = options?.employeesForUser ?? [{ id: "emp-1", profile_id: "user-1", display_name: "Miška", color: "#111111" }];
  firestoreFixtures.fallbackEmployees = options?.fallbackEmployees ?? firestoreFixtures.employeesForUser;
  firestoreFixtures.appointments = options?.appointments ?? [];
  firestoreFixtures.timeBlocks = options?.timeBlocks ?? [];
  firestoreFixtures.services = options?.services ?? [{ id: "svc-1", name_sk: "Strih", duration_minutes: 30 }];
  firestoreFixtures.docsByPath = options?.docsByPath ?? {};
}

describe("MySchedulePage", () => {
  beforeEach(() => {
    bookingCalendarSpy.props = null;
    businessState.value = { businessId: "biz-1" };
    businessInfoState.value = {
      info: {
        business: { timezone: "Europe/Bratislava" },
        hours: [],
        overrides: [],
      },
    };
    authState.value = { user: { id: "user-1", email: "miska@papihairdesign.sk" }, profile: { full_name: "Miška" } };

    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    adminCalendarQuickActionMock.mockReset();
    firestoreMocks.getDocsMock.mockReset();
    firestoreMocks.getDocMock.mockReset();
    firestoreMocks.addDocMock.mockReset();
    firestoreMocks.updateDocMock.mockReset();
    firestoreMocks.deleteDocMock.mockReset();

    firestoreMocks.getDocsMock.mockImplementation(async (input: any) => {
      if (input?.__collection === "employees") {
        if (hasWhere(input, "profile_id")) {
          return makeSnapshot(firestoreFixtures.employeesForUser);
        }
        return makeSnapshot(firestoreFixtures.fallbackEmployees);
      }

      if (input?.__collection === "appointments") {
        return makeSnapshot(firestoreFixtures.appointments);
      }

      if (input?.__collection === "time_blocks") {
        return makeSnapshot(firestoreFixtures.timeBlocks);
      }

      if (input?.__collection === "services") {
        return makeSnapshot(firestoreFixtures.services);
      }

      return makeSnapshot([]);
    });

    firestoreMocks.getDocMock.mockImplementation(async (input: any) => {
      const fixture = firestoreFixtures.docsByPath[`${input?.__collection}/${input?.id}`];
      if (!fixture) {
        return {
          exists: () => false,
          data: () => undefined,
        };
      }

      return {
        exists: () => true,
        data: () => fixture,
      };
    });

    firestoreMocks.updateDocMock.mockResolvedValue(undefined);
    firestoreMocks.addDocMock.mockResolvedValue({ id: "apt-new" });
    firestoreMocks.deleteDocMock.mockResolvedValue(undefined);
    adminCalendarQuickActionMock.mockResolvedValue({ success: true });
  });

  it("shows empty state when user has no linked employee", async () => {
    seedScheduleFirestore({
      employeesForUser: [],
      fallbackEmployees: [],
    });

    render(<MySchedulePage />);

    expect(await screen.findByText("Váš účet nie je prepojený so zamestnancom.")).toBeInTheDocument();
    expect(screen.getByText("Kontaktujte administrátora.")).toBeInTheDocument();
  });

  it("falls back to a unique employee match by identity when profile_id is missing", async () => {
    seedScheduleFirestore({
      employeesForUser: [],
      fallbackEmployees: [
        { id: "emp-1", display_name: "Miška", email: "miska@papihairdesign.sk", color: "#111111" },
      ],
    });

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-calendar")).toBeInTheDocument();
    });
    expect(screen.queryByText("Váš účet nie je prepojený so zamestnancom.")).not.toBeInTheDocument();
  });

  it("loads appointments and time blocks with fallback customer and service names", async () => {
    seedScheduleFirestore({
      appointments: [
        {
          id: "apt-1",
          customer_id: "cust-1",
          customer_phone: "+421900000111",
          service_id: "svc-1",
          start_at: "2026-01-15T09:00:00.000Z",
          end_at: "2026-01-15T09:30:00.000Z",
          status: "confirmed",
        },
      ],
      timeBlocks: [
        {
          id: "block-1",
          reason: "Prestávka",
          start_at: "2026-01-15T10:00:00.000Z",
          end_at: "2026-01-15T10:30:00.000Z",
        },
      ],
      docsByPath: {
        "customers/cust-1": { full_name: "Jana Nováková" },
        "services/svc-1": { name_sk: "Farbenie" },
      },
    });

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-events")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("my-schedule-first-title")).toHaveTextContent("Jana Nováková – Farbenie");
  });

  it("renders toolbar actions in the correct order and today switches to day mode", async () => {
    seedScheduleFirestore();

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-calendar")).toBeInTheDocument();
    });

    const actions = screen.getByTestId("calendar-header-actions");
    const actionButtons = actions.querySelectorAll("button");
    expect(Array.from(actionButtons).map((button) => button.textContent?.trim())).toEqual([
      "Dnes",
      "Blokácia",
      "Nová rezervácia",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Dnes" }));

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-mode")).toHaveTextContent("day");
    });
  });

  it("marks confirmed appointment as completed from detail dialog", async () => {
    seedScheduleFirestore({
      appointments: [
        {
          id: "apt-1",
          customer_name: "Jana",
          customer_phone: "+421900000111",
          service_name: "Strih",
          start_at: "2026-01-15T09:00:00.000Z",
          end_at: "2026-01-15T09:30:00.000Z",
          status: "confirmed",
        },
      ],
    });

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-events")).toHaveTextContent("1");
    });
    fireEvent.click(screen.getByText("open-schedule-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Označiť ako dokončenú/i }));

    await waitFor(() => {
      expect(firestoreMocks.updateDocMock).toHaveBeenCalledWith(
        expect.objectContaining({ __collection: "appointments", id: "apt-1" }),
        expect.objectContaining({
          status: "completed",
          updated_at: expect.any(String),
        }),
      );
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Rezervácia dokončená");
  });

  it("stores newly selected slot in business timezone UTC", async () => {
    seedScheduleFirestore();

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("open-schedule-slot"));
    await screen.findByRole("heading", { name: /Nová rezervácia/i });

    fireEvent.change(screen.getByPlaceholderText("Meno a priezvisko"), {
      target: { value: "Test Customer" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť rezerváciu/i }));

    await waitFor(() => {
      expect(firestoreMocks.addDocMock).toHaveBeenCalledWith(
        expect.objectContaining({ __collection: "appointments", constraints: [] }),
        expect.objectContaining({
          start_at: "2026-01-15T08:00:00.000Z",
          end_at: "2026-01-15T08:30:00.000Z",
        }),
      );
    });
  });

  it("opens block dialog from block intent and saves block through callable action", async () => {
    seedScheduleFirestore();

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-calendar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("open-schedule-block-slot"));
    await screen.findByText("Pridať blokovaný čas");

    fireEvent.change(screen.getByLabelText("Názov blokovania"), {
      target: { value: "Dovolenka" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Uložiť$/i }));

    await waitFor(() => {
      expect(adminCalendarQuickActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: "biz-1",
          action: "block",
          employee_id: "emp-1",
          reason: "Dovolenka",
          timezone: "Europe/Bratislava",
        }),
      );
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Blokovaný čas bol uložený");
  });
});
