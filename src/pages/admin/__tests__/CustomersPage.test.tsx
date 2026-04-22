import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { cloneElement, isValidElement } from "react";
import CustomersPage from "../CustomersPage";

const businessState = vi.hoisted(() => ({
  value: { businessId: "biz-1" },
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const fixtures = vi.hoisted(() => ({
  customers: [] as any[],
  appointments: [] as any[],
  historyAppointments: [] as any[],
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, asChild }: any) => {
    if (asChild && isValidElement(children)) {
      return cloneElement(children, {
        onClick,
      });
    }

    return (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    );
  },
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
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    businessState.value = { businessId: "biz-1" };
    fixtures.customers = [
      { id: "cust-1", full_name: "Jana Novak", email: "jana@example.com", phone: "+421900111222" },
      { id: "cust-2", full_name: "Marek Urban", email: "marek@example.com", phone: null },
      { id: "cust-3", full_name: "Eva Test", email: null, phone: "+421900333444" },
      { id: "cust-4", full_name: "Loyal Guest", email: null, phone: null },
    ];
    fixtures.appointments = [
      { id: "apt-1", customer_id: "cust-1", start_at: "2099-01-10T09:00:00.000Z" },
      { id: "apt-2", customer_id: "cust-1", start_at: "2099-01-12T10:00:00.000Z" },
      { id: "apt-3", customer_id: "cust-2", start_at: "2099-01-11T11:00:00.000Z" },
      { id: "apt-4", customer_id: "cust-4", start_at: "2099-01-09T11:00:00.000Z" },
      { id: "apt-5", customer_id: "cust-4", start_at: "2099-01-08T11:00:00.000Z" },
      { id: "apt-6", customer_id: "cust-4", start_at: "2099-01-07T11:00:00.000Z" },
    ];
    fixtures.historyAppointments = [
      {
        id: "hist-1",
        service_name: "Strih",
        employee_name: "Marek",
        status: "confirmed",
        start_at: "2099-01-12T10:00:00.000Z",
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

  it("renders the owner overview cards and loaded rows", async () => {
    render(<CustomersPage />);

    expect(await screen.findByText("Zákazníci")).toBeInTheDocument();
    expect(screen.getAllByText("Všetci klienti").length).toBeGreaterThan(0);
    expect(screen.getByText("Kontaktovateľní")).toBeInTheDocument();
    expect(screen.getByText("Loyal Guest")).toBeInTheDocument();
    expect(screen.getByText("Verný klient")).toBeInTheDocument();
  });

  it("shows the correct overview metric values", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("shows active client label for customers with recent visits", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    expect(screen.getAllByText("Aktívny klient").length).toBeGreaterThan(0);
  });

  it("shows missing contact badge for customers without email and phone", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    expect(screen.getByText("Chýba kontakt")).toBeInTheDocument();
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

    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "Jana" },
    });

    expect(screen.getByText("Jana Novak")).toBeInTheDocument();
    expect(screen.queryByText("Marek Urban")).not.toBeInTheDocument();
  });

  it("filters by email and phone", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "333444" },
    });

    expect(screen.getByText("Eva Test")).toBeInTheDocument();
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("shows filtered empty state when search has no matches", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "neexistuje" },
    });

    expect(screen.getByText("Žiadni zákazníci")).toBeInTheDocument();
    expect(
      screen.getByText("Skúste zmeniť segment alebo vyhľadávací výraz. Aktuálne filtre nenašli žiadneho klienta."),
    ).toBeInTheDocument();
  });

  it("keeps clear filters button disabled before any interaction", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    expect(screen.getByRole("button", { name: /Vyčistiť filtre/i })).toBeDisabled();
  });

  it("enables clear filters button when search is active", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "Jana" },
    });

    expect(screen.getByRole("button", { name: /Vyčistiť filtre/i })).not.toBeDisabled();
  });

  it("supports the quick owner segments", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Bez kontaktu/i }));
    expect(screen.getByText("Loyal Guest")).toBeInTheDocument();
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Verní/i }));
    expect(screen.getByText("Loyal Guest")).toBeInTheDocument();
    expect(screen.queryByText("Eva Test")).not.toBeInTheDocument();
  });

  it("changes the summary label when recent segment is active", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Aktívni/i }));

    expect(screen.getByText(/Aktívni za posledných 45 dní/i)).toBeInTheDocument();
  });

  it("changes the summary label when loyal segment is active", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Verní/i }));

    expect(screen.getByText(/Verní klienti \(3\+ návštev\)/i)).toBeInTheDocument();
  });

  it("changes the summary label when missing contact segment is active", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Bez kontaktu/i }));

    expect(screen.getByText("Klienti bez kontaktu")).toBeInTheDocument();
  });

  it("shows the filtered customer count in the summary panel", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Bez kontaktu/i }));

    expect(screen.getByText(/Zobrazených/i)).toHaveTextContent("1");
  });

  it("recent segment excludes customers without any visit", async () => {
    fixtures.customers.push({
      id: "cust-5",
      full_name: "No Visit Client",
      email: "novisit@example.com",
      phone: null,
    });

    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Aktívni/i }));

    expect(screen.queryByText("No Visit Client")).not.toBeInTheDocument();
  });

  it("all segment restores every customer after switching filters", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Bez kontaktu/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Všetci/i }));

    expect(screen.getByText("Jana Novak")).toBeInTheDocument();
    expect(screen.getByText("Marek Urban")).toBeInTheDocument();
    expect(screen.getByText("Eva Test")).toBeInTheDocument();
    expect(screen.getByText("Loyal Guest")).toBeInTheDocument();
  });

  it("clears active filters and returns to the full list", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "Jana" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Vyčistiť filtre/i }));

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
    expect(screen.getByText("Marek Urban")).toBeInTheDocument();
    expect(screen.getByText("Loyal Guest")).toBeInTheDocument();
  });

  it("sorts by visits and toggles direction on repeated click", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Návštevy/i }));
    const firstSort = screen.getAllByText(/ID:/i)[0];
    expect(firstSort).toHaveTextContent("ID: cust-3");

    fireEvent.click(screen.getByRole("button", { name: /Návštevy/i }));
    const secondSort = screen.getAllByText(/ID:/i)[0];
    expect(secondSort).toHaveTextContent("ID: cust-4");
  }, 15000);

  it("sorts by last visit date", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Posledná návšteva/i }));
    const firstSort = screen.getAllByText(/ID:/i)[0];
    expect(firstSort).toHaveTextContent("ID: cust-4");

    fireEvent.click(screen.getByRole("button", { name: /Posledná návšteva/i }));
    const secondSort = screen.getAllByText(/ID:/i)[0];
    expect(secondSort).toHaveTextContent("ID: cust-1");
  }, 15000);

  it("copies contact details from quick actions", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const janaRow = screen.getByText("Jana Novak").closest("tr");
    expect(janaRow).toBeTruthy();

    fireEvent.click(within(janaRow as HTMLElement).getByRole("button", { name: /Kopírovať kontakt/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("jana@example.com");
      expect(toastMocks.success).toHaveBeenCalledWith("E-mail skopírovaný");
    });
  });

  it("copies email from dropdown owner actions", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getAllByRole("button", { name: /Kopírovať e-mail/i })[0]);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("jana@example.com");
      expect(toastMocks.success).toHaveBeenCalledWith("E-mail skopírovaný");
    });
  });

  it("copies phone from dropdown owner actions", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const janaRow = screen.getByText("Jana Novak").closest("tr");
    expect(janaRow).toBeTruthy();

    fireEvent.click(within(janaRow as HTMLElement).getByRole("button", { name: /Kopírovať telefón/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("+421900111222");
      expect(toastMocks.success).toHaveBeenCalledWith("Telefón skopírovaný");
    });
  });

  it("renders mailto link in owner actions", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const emailAction = screen.getAllByRole("link", { name: /Napísať e-mail/i })[0];
    expect(emailAction).toHaveAttribute("href", "mailto:jana@example.com");
  });

  it("renders tel link in owner actions", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const janaRow = screen.getByText("Jana Novak").closest("tr");
    expect(janaRow).toBeTruthy();

    const phoneAction = within(janaRow as HTMLElement).getByRole("link", { name: /Zavolať klientovi/i });
    expect(phoneAction).toHaveAttribute("href", "tel:+421900111222");
  });

  it("shows toast error when clipboard copy fails", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("copy failed")),
      },
    });

    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const janaRow = screen.getByText("Jana Novak").closest("tr");
    expect(janaRow).toBeTruthy();
    fireEvent.click(within(janaRow as HTMLElement).getByRole("button", { name: /Kopírovať kontakt/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Nepodarilo sa skopírovať e-mail");
    });
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

  it("shows email quick action inside the history dialog", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const janaRow = screen.getByText("Jana Novak").closest("tr");
    expect(janaRow).toBeTruthy();
    fireEvent.click(within(janaRow as HTMLElement).getByRole("button", { name: /História rezervácií/i }));

    const emailLink = await screen.findByText("E-mail");
    expect(emailLink.closest("a")).toHaveAttribute("href", "mailto:jana@example.com");
  });

  it("shows phone quick action inside the history dialog", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const janaRow = screen.getByText("Jana Novak").closest("tr");
    expect(janaRow).toBeTruthy();
    fireEvent.click(within(janaRow as HTMLElement).getByRole("button", { name: /História rezervácií/i }));

    const phoneLink = await screen.findByText("Telefón");
    expect(phoneLink.closest("a")).toHaveAttribute("href", "tel:+421900111222");
  });

  it("uses phone as dialog description fallback when email is missing", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const evaRow = screen.getByText("Eva Test").closest("tr");
    expect(evaRow).toBeTruthy();
    fireEvent.click(within(evaRow as HTMLElement).getByRole("button", { name: /História rezervácií/i }));

    expect(await screen.findByText(/Eva Test · \+421900333444/i)).toBeInTheDocument();
  });

  it("uses no contact fallback in dialog description when both email and phone are missing", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const loyalRow = screen.getByText("Loyal Guest").closest("tr");
    expect(loyalRow).toBeTruthy();
    fireEvent.click(within(loyalRow as HTMLElement).getByRole("button", { name: /História rezervácií/i }));

    expect(await screen.findByText(/Loyal Guest · bez kontaktu/i)).toBeInTheDocument();
  });

  it("shows the customer booking count badge inside the dialog", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    const loyalRow = screen.getByText("Loyal Guest").closest("tr");
    expect(loyalRow).toBeTruthy();
    fireEvent.click(within(loyalRow as HTMLElement).getByRole("button", { name: /História rezervácií/i }));

    expect(await screen.findByText("3 rezervácií")).toBeInTheDocument();
  });

  it("renders the loyal badge in the table only for customers with enough visits", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    expect(screen.getAllByText("Verný klient")).toHaveLength(1);
  });

  it("shows contact helper text for customers with missing contact", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    expect(screen.getByText("Klient zatiaľ nemá vyplnený e-mail ani telefón.")).toBeInTheDocument();
  });

  it("search and segment can work together", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Aktívni/i }));
    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "Marek" },
    });

    expect(screen.getByText("Marek Urban")).toBeInTheDocument();
    expect(screen.queryByText("Jana Novak")).not.toBeInTheDocument();
  });

  it("missing contact segment still shows the empty-state helper when no item matches the search", async () => {
    render(<CustomersPage />);
    await screen.findByText("Zákazníci");

    fireEvent.click(screen.getByRole("button", { name: /Bez kontaktu/i }));
    fireEvent.change(screen.getByPlaceholderText("Hľadať meno, e-mail alebo telefón..."), {
      target: { value: "Jana" },
    });

    expect(screen.getByText("Žiadni zákazníci")).toBeInTheDocument();
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
