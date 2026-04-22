import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeesPage from "../EmployeesPage";

const businessState = vi.hoisted(() => ({
  value: { businessId: "biz-1", isOwner: true },
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

const batchMocks = vi.hoisted(() => ({
  delete: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(),
}));

const fixtures = vi.hoisted(() => ({
  employees: [] as any[],
  schedules: [] as any[],
  services: [] as any[],
  employeeServices: [] as any[],
  appointmentsByEmployee: [] as any[],
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/components/admin/AvatarCropper", () => ({
  AvatarCropper: ({ onConfirm }: any) => (
    <button onClick={() => onConfirm(new Blob(["x"], { type: "image/jpeg" }))}>confirm-crop</button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      aria-label="switch"
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input
      id={id}
      aria-label={id ?? "checkbox"}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("firebase/storage", () => ({
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytes: storageMocks.uploadBytes,
  getDownloadURL: storageMocks.getDownloadURL,
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
    doc: (_dbOrRef: unknown, nameOrId?: string, id?: string) => {
      if (id) return { __collection: nameOrId, id };
      return { __collection: "unknown", id: nameOrId };
    },
    getDocs: firestoreMocks.getDocs,
    addDoc: firestoreMocks.addDoc,
    updateDoc: firestoreMocks.updateDoc,
    deleteDoc: vi.fn(),
    writeBatch: firestoreMocks.writeBatch,
  };
});

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
  storage: {},
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

function whereValue(input: any, field: string): unknown {
  return (input?.constraints ?? []).find((c: any) => c?.type === "where" && c?.field === field)?.value;
}

describe("EmployeesPage", () => {
  beforeEach(() => {
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.addDoc.mockReset();
    firestoreMocks.updateDoc.mockReset();
    storageMocks.uploadBytes.mockReset();
    storageMocks.getDownloadURL.mockReset();
    batchMocks.delete.mockReset();
    batchMocks.set.mockReset();
    batchMocks.commit.mockReset();

    businessState.value = { businessId: "biz-1", isOwner: true };

    fixtures.employees = [
      {
        id: "emp-1",
        display_name: "Jana Novak",
        email: "jana@example.com",
        phone: "+421900111222",
        color: "#22c55e",
        photo_url: null,
        service_mode: "restricted",
        is_active: true,
      },
      {
        id: "emp-2",
        display_name: "Marek Urban",
        email: null,
        phone: null,
        color: "#3B82F6",
        photo_url: null,
        service_mode: "all",
        is_active: true,
      },
    ];
    fixtures.schedules = [
      { id: "sch-1", employee_id: "emp-1", day_of_week: "monday", start_time: "08:00", end_time: "16:00" },
      { id: "sch-2", employee_id: "emp-2", day_of_week: "tuesday", start_time: "10:00", end_time: "18:00" },
    ];
    fixtures.services = [
      { id: "srv-1", name_sk: "Strih", is_active: true },
      { id: "srv-2", name_sk: "Farbenie", is_active: true },
    ];
    fixtures.employeeServices = [{ id: "es-1", employee_id: "emp-1", service_id: "srv-1" }];
    fixtures.appointmentsByEmployee = [];

    vi.stubGlobal("confirm", vi.fn(() => true));
    firestoreMocks.writeBatch.mockReturnValue(batchMocks);
    batchMocks.commit.mockResolvedValue(undefined);
    firestoreMocks.addDoc.mockResolvedValue({ id: "emp-new" });
    firestoreMocks.updateDoc.mockResolvedValue(undefined);
    storageMocks.uploadBytes.mockResolvedValue(undefined);
    storageMocks.getDownloadURL.mockResolvedValue("https://cdn/avatar.jpg");

    firestoreMocks.getDocs.mockImplementation(async (input: any) => {
      const collectionName = input?.__collection;
      if (collectionName === "employees") return makeSnapshot(fixtures.employees);
      if (collectionName === "schedules") {
        if (hasWhere(input, "employee_id")) {
          const value = whereValue(input, "employee_id");
          if (Array.isArray(value)) return makeSnapshot(fixtures.schedules.filter((s) => value.includes(s.employee_id)));
          return makeSnapshot(fixtures.schedules.filter((s) => s.employee_id === value));
        }
        return makeSnapshot(fixtures.schedules);
      }
      if (collectionName === "services") return makeSnapshot(fixtures.services);
      if (collectionName === "employee_services") {
        const employeeId = whereValue(input, "employee_id");
        return makeSnapshot(fixtures.employeeServices.filter((row) => row.employee_id === employeeId));
      }
      if (collectionName === "appointments") return makeSnapshot(fixtures.appointmentsByEmployee);
      return makeSnapshot([]);
    });
  });

  it("renders heading and loaded team members", async () => {
    render(<EmployeesPage />);
    expect(await screen.findByText("Tím")).toBeInTheDocument();
    expect(screen.getByText("Jana Novak")).toBeInTheDocument();
    expect(screen.getByText("Marek Urban")).toBeInTheDocument();
  });

  it("uses bundled preset photos for Mato, Miska and Papi when remote photo is missing", async () => {
    fixtures.employees = [
      {
        id: "emp-mato",
        display_name: "Mato",
        email: null,
        phone: null,
        color: "#22c55e",
        photo_url: null,
        service_mode: "all",
        is_active: true,
      },
      {
        id: "emp-miska",
        display_name: "Miska",
        email: null,
        phone: null,
        color: "#a855f7",
        photo_url: null,
        service_mode: "all",
        is_active: true,
      },
      {
        id: "emp-papi",
        display_name: "Papi",
        email: null,
        phone: null,
        color: "#f59e0b",
        photo_url: null,
        service_mode: "all",
        is_active: true,
      },
    ];
    fixtures.schedules = [];

    const { container } = render(<EmployeesPage />);
    await screen.findByText("Mato");

    const styledAvatars = Array.from(container.querySelectorAll("div[style]")).map((element) =>
      (element as HTMLDivElement).style.backgroundImage,
    );

    expect(styledAvatars.some((value) => value.includes("/mato.webp"))).toBe(true);
    expect(styledAvatars.some((value) => value.includes("/miska.webp"))).toBe(true);
    expect(styledAvatars.some((value) => value.includes("/papi.webp"))).toBe(true);
  });

  it("shows loading state before data arrives", async () => {
    render(<EmployeesPage />);
    expect(screen.getByText("Načítavam zoznam tímu...")).toBeInTheDocument();
    await screen.findByText("Tím");
  });

  it("shows empty state when there are no employees", async () => {
    fixtures.employees = [];
    fixtures.schedules = [];
    render(<EmployeesPage />);
    expect(await screen.findByText("Žiadni členovia tímu")).toBeInTheDocument();
  });

  it("opens create dialog from page action button", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getByRole("button", { name: /Pridať člena tímu/i }));
    expect(screen.getByText("Pridať nového člena tímu")).toBeInTheDocument();
  });

  it("opens create dialog from empty state CTA", async () => {
    fixtures.employees = [];
    render(<EmployeesPage />);
    await screen.findByText("Žiadni členovia tímu");
    fireEvent.click(screen.getByRole("button", { name: /Pridať prvého zamestnanca/i }));
    expect(screen.getByText("Pridať nového člena tímu")).toBeInTheDocument();
  });

  it("shows validation toast when display name is missing", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getByRole("button", { name: /Pridať člena tímu/i }));
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť profil/i }));
    expect(toastMocks.error).toHaveBeenCalledWith("Zadajte meno");
  });

  it("rejects unsupported profile photo file type", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getByRole("button", { name: /Pridať člena tímu/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(["bad"], "avatar.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(toastMocks.error).toHaveBeenCalledWith("Podporované sú iba JPG, PNG alebo WEBP súbory.");
  });

  it("requires owner to select at least one service in restricted mode", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getByRole("button", { name: /Pridať člena tímu/i }));
    fireEvent.change(screen.getByPlaceholderText("napr. Jana Nováková"), { target: { value: "Nina" } });
    fireEvent.click(screen.getAllByLabelText("switch")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť profil/i }));
    expect(toastMocks.error).toHaveBeenCalledWith("Majiteľ musí priradiť aspoň jednu službu.");
  });

  it("uses native scroll containers for employee dialog and restricted services list", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");

    fireEvent.click(screen.getByRole("button", { name: /Pridať člena tímu/i }));
    expect(screen.getByTestId("employee-dialog-scroll-container")).toHaveClass("overflow-y-auto");

    fireEvent.click(screen.getAllByLabelText("switch")[0]);
    const servicesScroll = await screen.findByTestId("employee-services-scroll-container");
    expect(servicesScroll).toHaveClass("overflow-y-auto");
    expect(servicesScroll).toHaveClass("overscroll-contain");
  });

  it("re-opens restricted services without losing the scrollable service list", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");

    const editButtons = screen.getAllByRole("button", { name: /Upraviť profil/i });
    fireEvent.click(editButtons[0]);
    await screen.findByTestId("employee-services-scroll-container");

    fireEvent.click(screen.getByRole("button", { name: /Zrušiť/i }));
    expect(screen.queryByTestId("employee-services-scroll-container")).not.toBeInTheDocument();

    fireEvent.click(editButtons[0]);
    expect(await screen.findByTestId("employee-services-scroll-container")).toHaveClass("overflow-y-auto");
  });

  it("creates employee and persists schedule + selected services", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getByRole("button", { name: /Pridať člena tímu/i }));
    fireEvent.change(screen.getByPlaceholderText("napr. Jana Nováková"), { target: { value: "Nina New" } });
    fireEvent.click(screen.getAllByLabelText("switch")[0]);
    fireEvent.click(screen.getByLabelText("srv-srv-1"));
    fireEvent.click(screen.getByRole("button", { name: /Vytvoriť profil/i }));

    await waitFor(() => expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(batchMocks.commit).toHaveBeenCalledTimes(1));
    expect(batchMocks.set.mock.calls.some(([, payload]) =>
      payload?.business_id === "biz-1" &&
      payload?.employee_id === "emp-new" &&
      payload?.service_id === "srv-1"
    )).toBe(true);
    expect(toastMocks.success).toHaveBeenCalledWith("Zamestnanec pridaný");
  });

  it("opens edit dialog and updates employee", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getAllByRole("button", { name: /Upraviť profil/i })[0]);
    expect(screen.getByText("Upraviť profil člena")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("srv-srv-1")).toBeChecked());

    fireEvent.change(screen.getByPlaceholderText("napr. Jana Nováková"), { target: { value: "Jana Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť zmeny/i }));

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalled());
    expect(toastMocks.success).toHaveBeenCalledWith("Zamestnanec aktualizovaný");
  });

  it("rewrites selected services for restricted employee edits", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getAllByRole("button", { name: /Upraviť profil/i })[0]);

    await waitFor(() => expect(screen.getByLabelText("srv-srv-1")).toBeChecked());
    fireEvent.click(screen.getByLabelText("srv-srv-1"));
    fireEvent.click(screen.getByLabelText("srv-srv-2"));
    fireEvent.click(screen.getByRole("button", { name: /Uložiť zmeny/i }));

    await waitFor(() => expect(batchMocks.commit).toHaveBeenCalled());
    expect(batchMocks.delete).toHaveBeenCalledWith(expect.objectContaining({ __collection: "employee_services", id: "es-1" }));
    expect(batchMocks.set.mock.calls.some(([, payload]) =>
      payload?.business_id === "biz-1" &&
      payload?.employee_id === "emp-1" &&
      payload?.service_id === "srv-2"
    )).toBe(true);
  });

  it("loads employee services while opening edit for owner", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getAllByRole("button", { name: /Upraviť profil/i })[0]);

    await waitFor(() =>
      expect(firestoreMocks.getDocs.mock.calls.some((call) => call[0]?.__collection === "employee_services")).toBe(true),
    );
  });

  it("does not load employee services when user is not owner", async () => {
    businessState.value = { businessId: "biz-1", isOwner: false };
    render(<EmployeesPage />);
    await screen.findByText("Tím");
    fireEvent.click(screen.getAllByRole("button", { name: /Upraviť profil/i })[0]);

    expect(firestoreMocks.getDocs.mock.calls.some((call) => call[0]?.__collection === "employee_services")).toBe(false);
  });

  it("does not delete employee when confirm is rejected", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<EmployeesPage />);
    await screen.findByText("Tím");

    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);
    expect(batchMocks.commit).not.toHaveBeenCalled();
  });

  it("blocks delete when active appointments exist", async () => {
    fixtures.appointmentsByEmployee = [{ id: "apt-1", status: "confirmed" }];
    render(<EmployeesPage />);
    await screen.findByText("Tím");

    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Nemožno odstrániť — existujú rezervácie"));
    expect(batchMocks.commit).not.toHaveBeenCalled();
  });

  it("deletes employee and related rows when no blocking appointments", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Tím");

    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);
    await waitFor(() => expect(batchMocks.commit).toHaveBeenCalledTimes(1));
    expect(toastMocks.success).toHaveBeenCalledWith("Zamestnanec odstránený");
  });

  it("shows delete failure toast when batch commit fails", async () => {
    batchMocks.commit.mockRejectedValueOnce(new Error("delete fail"));
    render(<EmployeesPage />);
    await screen.findByText("Tím");

    fireEvent.click(screen.getAllByRole("button").find((btn) => btn.className.includes("text-destructive"))!);
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Odstránenie zlyhalo"));
  });
});
