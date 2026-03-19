import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MySchedulePage from "../MySchedulePage";

const businessState = vi.hoisted(() => ({
  value: {
    businessId: "biz-1",
  },
}));

const authState = vi.hoisted(() => ({
  value: {
    user: { id: "user-1" },
  },
}));

const calendarSpy = vi.hoisted(() => ({
  props: null as any,
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getDocMock: vi.fn(),
  updateDocMock: vi.fn(),
}));

const firestoreFixtures = vi.hoisted(() => ({
  employeesForUser: [] as any[],
  fallbackEmployees: [] as any[],
  appointments: [] as any[],
  docsByPath: {} as Record<string, any>,
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState.value,
}));

vi.mock("react-big-calendar", () => ({
  dateFnsLocalizer: () => ({}),
  Calendar: (props: any) => {
    calendarSpy.props = props;
    return (
      <div data-testid="my-schedule-calendar">
        <div data-testid="my-schedule-events">{String(props.events?.length ?? 0)}</div>
        <div data-testid="my-schedule-first-title">{props.events?.[0]?.title ?? ""}</div>
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
    updateDoc: firestoreMocks.updateDocMock,
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
  docsByPath?: Record<string, any>;
}) {
  firestoreFixtures.employeesForUser = options?.employeesForUser ?? [{ id: "emp-1", profile_id: "user-1" }];
  firestoreFixtures.fallbackEmployees = options?.fallbackEmployees ?? [{ id: "emp-2" }];
  firestoreFixtures.appointments = options?.appointments ?? [];
  firestoreFixtures.docsByPath = options?.docsByPath ?? {};
}

describe("MySchedulePage", () => {
  beforeEach(() => {
    calendarSpy.props = null;
    businessState.value = { businessId: "biz-1" };
    authState.value = { user: { id: "user-1" } };

    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    firestoreMocks.getDocsMock.mockReset();
    firestoreMocks.getDocMock.mockReset();
    firestoreMocks.updateDocMock.mockReset();

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

  it("loads appointments and fills missing customer and service names from fallback documents", async () => {
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
      docsByPath: {
        "customers/cust-1": { full_name: "Jana Nováková" },
        "services/svc-1": { name_sk: "Farbenie" },
      },
    });

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-events")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("my-schedule-first-title")).toHaveTextContent("Jana Nováková – Farbenie");
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

  it("shows error toast when completion update fails", async () => {
    seedScheduleFirestore({
      appointments: [
        {
          id: "apt-1",
          customer_name: "Jana",
          service_name: "Strih",
          start_at: "2026-01-15T09:00:00.000Z",
          end_at: "2026-01-15T09:30:00.000Z",
          status: "confirmed",
        },
      ],
    });
    firestoreMocks.updateDocMock.mockRejectedValueOnce(new Error("write failed"));

    render(<MySchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("my-schedule-events")).toHaveTextContent("1");
    });
    fireEvent.click(screen.getByText("open-schedule-event"));
    fireEvent.click(await screen.findByRole("button", { name: /Označiť ako dokončenú/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Chyba pri aktualizácii");
    });
  });
});
