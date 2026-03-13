import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomersPage from "../CustomersPage";

const businessState = vi.hoisted(() => ({
  value: { businessId: "biz-1" },
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
}));

const fixtures = vi.hoisted(() => ({
  customers: [] as any[],
  appointments: [] as any[],
  historyAppointments: [] as any[],
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
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
    getDocs: firestoreMocks.getDocs,
  };
});

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
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

function hasWhere(input: any, field: string): boolean {
  return (input?.constraints ?? []).some((c: any) => c?.type === "where" && c?.field === field);
}

describe("CustomersPage", () => {
  beforeEach(() => {
    firestoreMocks.getDocs.mockReset();

    businessState.value = { businessId: "biz-1" };
    fixtures.customers = [
      { id: "cust-1", full_name: "Jana Novak", email: "jana@example.com", phone: "+421900111222" },
      { id: "cust-2", full_name: "Marek Urban", email: "marek@example.com", phone: null },
      { id: "cust-3", full_name: "Eva Test", email: null, phone: "+421900333444" },
    ];
    fixtures.appointments = [
      { id: "apt-1", customer_id: "cust-1", start_at: "2026-01-10T09:00:00.000Z" },
      { id: "apt-2", customer_id: "cust-1", start_at: "2026-01-12T10:00:00.000Z" },
      { id: "apt-3", customer_id: "cust-2", start_at: "2026-01-11T11:00:00.000Z" },
    ];
    fixtures.historyAppointments = [
      {
        id: "hist-1",
        service_name: "Strih",
        employee_name: "Marek",
        status: "confirmed",
        start_at: "2026-01-12T10:00:00.000Z",
      },
    ];

    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;
      if (collectionName === "customers") return makeSnapshot(fixtures.customers);
      if (collectionName === "appointments" && hasWhere(input, "customer_id")) {
        return makeSnapshot(fixtures.historyAppointments);
      }
      if (collectionName === "appointments") return makeSnapshot(fixtures.appointments);
      return makeSnapshot([]);
    });
  });

  it("renders customers page heading and loaded rows", async () => {
    render(<CustomersPage />);
    expect(await screen.findByText("Zákazníci")).toBeInTheDocument();
    expect(screen.getByText("Jana Novak")).toBeInTheDocument();
    expect(screen.getByText("Marek Urban")).toBeInTheDocument();
  });

  it("shows loading indicator before data is loaded", async () => {
    render(<CustomersPage />);
    expect(screen.getByText("Načítavam zákazníkov...")).toBeInTheDocument();
    await screen.findByText("Zákazníci");
  });

  it("shows empty state when there are no customers", async () => {
    fixtures.customers = [];
    fixtures.appointments = [];
    render(<CustomersPage />);
    expect(await screen.findByText("Žiadni zákazníci")).toBeInTheDocument();
  });

  it("filters by customer name", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať zákazníka..."), {
      target: { value: "Jana" },
    });

    expect(screen.getByText("Jana Novak")).toBeInTheDocument();
    expect(screen.queryByText("Marek Urban")).not.toBeInTheDocument();
  });

  it("filters by customer email", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať zákazníka..."), {
      target: { value: "marek@example.com" },
    });

    expect(screen.getByText("Marek Urban")).toBeInTheDocument();
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("filters by customer phone", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať zákazníka..."), {
      target: { value: "333444" },
    });

    expect(screen.getByText("Eva Test")).toBeInTheDocument();
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("shows no-results text when search has no matches", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať zákazníka..."), {
      target: { value: "neexistuje" },
    });

    expect(screen.getByText("Žiadni zákazníci")).toBeInTheDocument();
    expect(screen.getByText("Skúste zmeniť kritériá vyhľadávania.")).toBeInTheDocument();
  });

  it("sorts by visits and toggles direction on repeated click", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Návštevy/i }));
    const firstSort = screen.getAllByText(/ID:/i)[0];
    expect(firstSort).toHaveTextContent("ID: cust-3");

    fireEvent.click(screen.getByRole("button", { name: /Návštevy/i }));
    const secondSort = screen.getAllByText(/ID:/i)[0];
    expect(secondSort).toHaveTextContent("ID: cust-1");
  });

  it("sorts by last visit date", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Posledná návšteva/i }));
    const firstSort = screen.getAllByText(/ID:/i)[0];
    expect(firstSort).toHaveTextContent("ID: cust-2");

    fireEvent.click(screen.getByRole("button", { name: /Posledná návšteva/i }));
    const secondSort = screen.getAllByText(/ID:/i)[0];
    expect(secondSort).toHaveTextContent("ID: cust-1");
  });

  it("computes visits and displays visit counts from appointments", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const badges = screen.getAllByText(/^\d+$/);
    expect(badges.some((el) => el.textContent === "2")).toBe(true);
    expect(badges.some((el) => el.textContent === "1")).toBe(true);
  });

  it("opens customer history dialog and loads history rows", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getAllByRole("button", { name: /História rezervácií/i })[0]);

    expect(await screen.findByText("História zákazníka")).toBeInTheDocument();
    expect(screen.getByText("Strih")).toBeInTheDocument();
    expect(screen.getByText("Marek")).toBeInTheDocument();
    expect(screen.getByText("Potvrdená")).toBeInTheDocument();
  });

  it("shows empty history message when customer has no appointments", async () => {
    fixtures.historyAppointments = [];
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getAllByRole("button", { name: /História rezervácií/i })[0]);

    expect(
      await screen.findByText("Pre tohto zákazníka zatiaľ neevidujeme žiadnu históriu rezervácií."),
    ).toBeInTheDocument();
  });

  it("shows and hides history loading state while fetching", async () => {
    let resolveHistory: ((value: any) => void) | null = null;
    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;
      if (collectionName === "customers") return makeSnapshot(fixtures.customers);
      if (collectionName === "appointments" && hasWhere(input, "customer_id")) {
        return await new Promise((resolve) => {
          resolveHistory = resolve;
        });
      }
      if (collectionName === "appointments") return makeSnapshot(fixtures.appointments);
      return makeSnapshot([]);
    });

    render(<CustomersPage />);
    await screen.findByText("Zákazníci");
    fireEvent.click(screen.getAllByRole("button", { name: /História rezervácií/i })[0]);

    expect(screen.getByRole("heading", { name: "História zákazníka" })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector("svg.animate-spin")).toBeTruthy();
    });

    resolveHistory?.(makeSnapshot(fixtures.historyAppointments));
    await waitFor(() => expect(screen.getByText("Strih")).toBeInTheDocument());
  });

  it("handles history loading error gracefully", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;
      if (collectionName === "customers") return makeSnapshot(fixtures.customers);
      if (collectionName === "appointments" && hasWhere(input, "customer_id")) {
        throw new Error("history fail");
      }
      if (collectionName === "appointments") return makeSnapshot(fixtures.appointments);
      return makeSnapshot([]);
    });

    render(<CustomersPage />);
    await screen.findByText("Zákazníci");
    fireEvent.click(screen.getAllByRole("button", { name: /História rezervácií/i })[0]);

    expect(await screen.findByText("História zákazníka")).toBeInTheDocument();
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();
  });
});
