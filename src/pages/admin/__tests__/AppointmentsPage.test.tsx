import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppointmentsPage from "../AppointmentsPage";

const businessState = vi.hoisted(() => ({
  value: { businessId: "biz-1", isOwnerOrAdmin: true },
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
}));

const adminUpdateBookingStatusMock = vi.hoisted(() => vi.fn());

const fixtures = vi.hoisted(() => ({
  appointments: [] as any[],
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/integrations/firebase/adminUpdateBookingStatus", () => ({
  adminUpdateBookingStatus: adminUpdateBookingStatusMock,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange }: any) => (
    <select aria-label="status-filter" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="all">Všetky</option>
      <option value="pending">Čakajúce</option>
      <option value="confirmed">Potvrdené</option>
      <option value="completed">Dokončené</option>
      <option value="no_show">No-show</option>
      <option value="cancelled">Zrušené</option>
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children }: any) => <>{children}</>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  class Timestamp {
    private date: Date;
    constructor(date: Date) {
      this.date = date;
    }
    toDate() {
      return this.date;
    }
  }
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
    getDocs: firestoreMocks.getDocs,
    updateDoc: vi.fn(),
    Timestamp,
  };
});

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
}));

function makeSnapshot(items: any[]) {
  return {
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
  };
}

function findWhereStatus(input: any): string | null {
  const statusConstraint = (input?.constraints ?? []).find(
    (c: any) => c?.type === "where" && c?.field === "status",
  );
  return statusConstraint?.value ?? null;
}

function makeAppointment(partial: Partial<any> = {}) {
  return {
    id: partial.id ?? "apt-1",
    customer_name: partial.customer_name ?? "Jana Novak",
    customer_email: partial.customer_email ?? "jana@example.com",
    customer_phone: partial.customer_phone ?? "+421900111222",
    service_name: partial.service_name ?? "Strih",
    service_price: partial.service_price ?? 20,
    employee_name: partial.employee_name ?? "Marek",
    status: partial.status ?? "pending",
    start_at: partial.start_at ?? "2026-01-15T09:00:00.000Z",
    end_at: partial.end_at ?? "2026-01-15T09:30:00.000Z",
  };
}

describe("AppointmentsPage", () => {
  beforeEach(() => {
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    firestoreMocks.getDocs.mockReset();
    adminUpdateBookingStatusMock.mockReset();
    adminUpdateBookingStatusMock.mockResolvedValue({ status: "confirmed" });

    businessState.value = { businessId: "biz-1", isOwnerOrAdmin: true };

    fixtures.appointments = [
      makeAppointment({ id: "apt-pending", customer_name: "Jana Novak", status: "pending" }),
      makeAppointment({ id: "apt-confirmed", customer_name: "Marek Urban", status: "confirmed", service_name: "Farbenie" }),
      makeAppointment({ id: "apt-completed", customer_name: "Eva Test", status: "completed", start_at: "2026-01-14T10:00:00.000Z" }),
    ];

    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const status = findWhereStatus(input);
      const items = status ? fixtures.appointments.filter((a) => a.status === status) : fixtures.appointments;
      return makeSnapshot(items);
    });

    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    } as any);
  });

  it("renders heading and appointment cards after load", async () => {
    render(<AppointmentsPage />);
    expect(await screen.findByText("Rezervácie")).toBeInTheDocument();
    expect(screen.getAllByText("Jana Novak").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marek Urban").length).toBeGreaterThan(0);
  });

  it("shows loading state on first render", async () => {
    render(<AppointmentsPage />);
    expect(screen.getByText("Spracúvam rezervácie...")).toBeInTheDocument();
    await screen.findByText("Rezervácie");
  });

  it("shows empty state when no appointments are found", async () => {
    fixtures.appointments = [];
    render(<AppointmentsPage />);
    expect(await screen.findByText("Žiadne rezervácie")).toBeInTheDocument();
  });

  it("filters cards by customer name", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");

    fireEvent.change(screen.getByPlaceholderText("Meno alebo služba..."), { target: { value: "Marek" } });

    expect(screen.getAllByText("Marek Urban").length).toBeGreaterThan(0);
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("filters cards by service name", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");

    fireEvent.change(screen.getByPlaceholderText("Meno alebo služba..."), { target: { value: "Farbenie" } });

    expect(screen.getAllByText("Marek Urban").length).toBeGreaterThan(0);
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("applies status filter and queries with status condition", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");

    fireEvent.change(screen.getByLabelText("status-filter"), { target: { value: "confirmed" } });

    await waitFor(() => {
      expect(screen.getAllByText("Marek Urban").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("opens detail dialog on card click", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");

    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));
    expect(await screen.findByText("Detail rezervácie")).toBeInTheDocument();
  }, 15000);

  it("shows details including contact, service and team member", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));

    expect(await screen.findByText("Detail rezervácie")).toBeInTheDocument();
    expect(screen.getByText("apt-pending")).toBeInTheDocument();
    expect(screen.getAllByText("jana@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+421900111222").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Strih").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marek").length).toBeGreaterThan(0);
  }, 15000);

  it("copies appointment reference to clipboard", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));

    const copyBtn = await screen.findByRole("button", { name: /Skopírovať/i });
    fireEvent.click(copyBtn);
    await waitFor(() =>
      expect((navigator.clipboard.writeText as any)).toHaveBeenCalledWith("apt-pending"),
    );
  }, 15000);

  it("renders history link with encoded appointment id", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));

    const link = await screen.findByRole("link", { name: /História/i });
    expect(link).toHaveAttribute("href", "/dashboard/history?ref=apt-pending");
  });

  it("shows pending actions for pending booking", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));

    expect(await screen.findByRole("button", { name: /Potvrdiť/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zrušiť/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Služba hotová/i })).not.toBeInTheDocument();
  }, 30000);

  it("shows confirmed actions for confirmed booking", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Marek Urban/i }));

    expect(await screen.findByRole("button", { name: /Služba hotová/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No-show/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zrušiť/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Potvrdiť/i })).not.toBeInTheDocument();
  }, 30000);

  it("hides status action buttons for completed booking", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Eva Test/i }));

    expect(await screen.findByText("Detail rezervácie")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Potvrdiť/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Služba hotová/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /No-show/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Zrušiť/i })).not.toBeInTheDocument();
  }, 15000);

  it("updates status to confirmed from pending", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Potvrdiť/i }));

    await waitFor(() =>
      expect(adminUpdateBookingStatusMock).toHaveBeenCalledWith({
        business_id: "biz-1",
        appointment_id: "apt-pending",
        status: "confirmed",
      }),
    );
    expect(toastMocks.success).toHaveBeenCalledWith("Status aktualizovaný");
  }, 15000);

  it("updates status to completed from confirmed", async () => {
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Marek Urban/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Služba hotová/i }));

    await waitFor(() =>
      expect(adminUpdateBookingStatusMock).toHaveBeenCalledWith({
        business_id: "biz-1",
        appointment_id: "apt-confirmed",
        status: "completed",
      }),
    );
  }, 15000);

  it("shows error toast when status update fails", async () => {
    adminUpdateBookingStatusMock.mockRejectedValueOnce(new Error("fail"));
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Potvrdiť/i }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Chyba pri aktualizácii"));
  });

  it("hides admin actions when user is not owner/admin", async () => {
    businessState.value = { businessId: "biz-1", isOwnerOrAdmin: false };
    render(<AppointmentsPage />);
    await screen.findByText("Rezervácie");
    fireEvent.click(screen.getByRole("button", { name: /Jana Novak/i }));

    expect(await screen.findByText("Detail rezervácie")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Potvrdiť/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Zrušiť/i })).not.toBeInTheDocument();
  }, 15000);
});
