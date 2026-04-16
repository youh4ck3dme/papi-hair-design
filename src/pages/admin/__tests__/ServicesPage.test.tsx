import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ServicesPage from "../ServicesPage";

const businessState = vi.hoisted(() => ({
  value: { businessId: "biz-1" },
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

const fixtures = vi.hoisted(() => ({
  services: [] as any[],
  serviceSubcategories: [] as any[],
  appointmentsForDelete: [] as any[],
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
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
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      aria-label="service-active-toggle"
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ __collection: name, constraints: [] }),
    where: (field: string, op: string, value: unknown) => ({ type: "where", field, op, value }),
    limit: (value: number) => ({ type: "limit", value }),
    query: (base: any, ...constraints: any[]) => ({
      __collection: base?.__collection ?? "unknown",
      constraints: [...(base?.constraints ?? []), ...constraints],
    }),
    doc: (_db: unknown, name: string, id: string) => ({ __collection: name, id }),
    getDocs: firestoreMocks.getDocs,
    addDoc: firestoreMocks.addDoc,
    updateDoc: firestoreMocks.updateDoc,
    deleteDoc: firestoreMocks.deleteDoc,
    writeBatch: firestoreMocks.writeBatch,
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

describe("ServicesPage", () => {
  beforeEach(() => {
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.addDoc.mockReset();
    firestoreMocks.updateDoc.mockReset();
    firestoreMocks.deleteDoc.mockReset();
    firestoreMocks.writeBatch.mockReset();

    businessState.value = { businessId: "biz-1" };

    fixtures.services = [
      {
        id: "svc-1",
        name_sk: "Pánsky strih",
        duration_minutes: 30,
        buffer_minutes: 5,
        price: 18,
        is_active: true,
        business_id: "biz-1",
        category: "panske",
        description_sk: "Klasický strih",
      },
      {
        id: "svc-2",
        name_sk: "Farbenie",
        duration_minutes: 90,
        buffer_minutes: 0,
        price: 45,
        is_active: false,
        business_id: "biz-1",
        category: "damske",
        description_sk: null,
      },
    ];
    fixtures.serviceSubcategories = [];
    fixtures.appointmentsForDelete = [];

    vi.stubGlobal("confirm", vi.fn(() => true));

    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;
      if (collectionName === "services") return makeSnapshot(fixtures.services);
      if (collectionName === "service_subcategories") return makeSnapshot(fixtures.serviceSubcategories);
      if (collectionName === "appointments") return makeSnapshot(fixtures.appointmentsForDelete);
      return makeSnapshot([]);
    });

    firestoreMocks.addDoc.mockImplementation(async (_target: any, payload: any) => {
      fixtures.services.push({ ...payload, id: "svc-new" });
      return { id: "svc-new" };
    });
    firestoreMocks.updateDoc.mockResolvedValue(undefined);
    firestoreMocks.deleteDoc.mockImplementation(async (target: any) => {
      fixtures.services = fixtures.services.filter((service) => service.id !== target?.id);
    });
    firestoreMocks.writeBatch.mockImplementation(() => {
      const operations: Array<() => void> = [];
      return {
        update: (target: any, payload: any) => {
          operations.push(() => {
            if (target?.__collection === "services") {
              fixtures.services = fixtures.services.map((service) =>
                service.id === target.id ? { ...service, ...payload } : service,
              );
            }
            if (target?.__collection === "service_subcategories") {
              fixtures.serviceSubcategories = fixtures.serviceSubcategories.map((subcategory) =>
                subcategory.id === target.id ? { ...subcategory, ...payload } : subcategory,
              );
            }
          });
        },
        delete: (target: any) => {
          operations.push(() => {
            if (target?.__collection === "service_subcategories") {
              fixtures.serviceSubcategories = fixtures.serviceSubcategories.filter(
                (subcategory) => subcategory.id !== target.id,
              );
            }
          });
        },
        commit: async () => {
          operations.forEach((operation) => operation());
        },
      };
    });
  });

  it("renders title and loaded services", async () => {
    render(<ServicesPage />);
    expect(await screen.findByText("Služby")).toBeInTheDocument();
    expect(screen.getByText("Pánsky strih")).toBeInTheDocument();
    expect(screen.getByText("Farbenie")).toBeInTheDocument();
  });

  it("shows loading text before content", async () => {
    render(<ServicesPage />);
    expect(screen.getByText("Načítavam katalóg služieb...")).toBeInTheDocument();
    await screen.findByText("Služby");
  });

  it("shows empty state when no services are returned", async () => {
    fixtures.services = [];
    render(<ServicesPage />);

    expect(await screen.findByText("Katalóg je prázdny")).toBeInTheDocument();
  });

  it("opens create dialog from top button", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");

    fireEvent.click(screen.getByRole("button", { name: /Pridať službu/i }));
    expect(screen.getByText("Pridať novú službu")).toBeInTheDocument();
  });

  it("renders managed subcategory groups when definitions exist", async () => {
    fixtures.serviceSubcategories = [
      {
        id: "sub-1",
        business_id: "biz-1",
        category: "damske",
        name_sk: "Balayage",
        slug: "balayage",
        sort_order: 100,
        is_active: true,
      },
    ];

    render(<ServicesPage />);

    expect(await screen.findByText("Balayage")).toBeInTheDocument();
  });

  it("opens create dialog from empty state CTA", async () => {
    fixtures.services = [];
    render(<ServicesPage />);
    await screen.findByText("Katalóg je prázdny");

    fireEvent.click(screen.getByRole("button", { name: /Pridať prvú službu/i }));
    expect(screen.getByText("Pridať novú službu")).toBeInTheDocument();
  });

  it("shows validation error for short name on save", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getByRole("button", { name: /Pridať službu/i }));

    fireEvent.change(screen.getByLabelText("Názov služby *"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť službu/i }));

    expect(screen.getByText("Názov musí mať aspoň 2 znaky")).toBeInTheDocument();
    expect(firestoreMocks.addDoc).not.toHaveBeenCalled();
  });

  it("shows validation error for duration under minimum", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getByRole("button", { name: /Pridať službu/i }));

    fireEvent.change(screen.getByLabelText("Názov služby *"), { target: { value: "Nový strih" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť službu/i }));

    expect(screen.getByText("Min. 5 minút")).toBeInTheDocument();
    expect(firestoreMocks.addDoc).not.toHaveBeenCalled();
  });

  it("creates service successfully and shows success toast", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getByRole("button", { name: /Pridať službu/i }));

    fireEvent.change(screen.getByLabelText("Názov služby *"), { target: { value: "Nová služba" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "45" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[2], { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť službu/i }));

    await waitFor(() => expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1));
    expect(toastMocks.success).toHaveBeenCalledWith("Služba pridaná");
  });

  it("shows save error toast when create fails", async () => {
    firestoreMocks.addDoc.mockRejectedValueOnce(new Error("boom"));

    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getByRole("button", { name: /Pridať službu/i }));
    fireEvent.change(screen.getByLabelText("Názov služby *"), { target: { value: "Nová služba" } });
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť službu/i }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Chyba pri ukladaní služby"));
  });

  it("opens edit mode and updates existing service", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");

    fireEvent.click(screen.getAllByRole("button", { name: /Upraviť/i })[0]);
    expect(screen.getByText("Upraviť službu")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Názov služby *"), { target: { value: "Pánsky strih PRO" } });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť zmeny/i }));

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1));
    expect(toastMocks.success).toHaveBeenCalledWith("Služba aktualizovaná");
  });

  it("toggles service active state", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");

    fireEvent.click(screen.getAllByLabelText("service-active-toggle")[0]);

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalled());
  });

  it("shows toast when toggle fails", async () => {
    firestoreMocks.updateDoc.mockRejectedValueOnce(new Error("toggle fail"));
    render(<ServicesPage />);
    await screen.findByText("Služby");

    fireEvent.click(screen.getAllByLabelText("service-active-toggle")[0]);

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Zmena stavu zlyhala"));
  });

  it("does not delete when user cancels confirm dialog", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<ServicesPage />);
    await screen.findByText("Služby");

    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);

    expect(firestoreMocks.deleteDoc).not.toHaveBeenCalled();
  });

  it("blocks delete when service has active appointments", async () => {
    fixtures.appointmentsForDelete = [{ id: "apt-1", status: "confirmed" }];

    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);

    await waitFor(() =>
      expect(toastMocks.error).toHaveBeenCalledWith("Nemožno odstrániť — existujú rezervácie"),
    );
    expect(firestoreMocks.deleteDoc).not.toHaveBeenCalled();
  });

  it("deletes service when no active appointments exist", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);

    await waitFor(() => expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(1));
    expect(toastMocks.success).toHaveBeenCalledWith("Služba odstránená");
  });

  it("shows delete error toast when delete operation fails", async () => {
    firestoreMocks.deleteDoc.mockRejectedValueOnce(new Error("delete fail"));
    render(<ServicesPage />);
    await screen.findByText("Služby");
    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Odstránenie zlyhalo"));
  });

  it("opens create subcategory dialog from top action", async () => {
    render(<ServicesPage />);
    await screen.findByText("Služby");

    fireEvent.click(screen.getByRole("button", { name: /Pridať podkategóriu/i }));
    expect(screen.getByRole("heading", { name: "Pridať podkategóriu" })).toBeInTheDocument();
  });
});
