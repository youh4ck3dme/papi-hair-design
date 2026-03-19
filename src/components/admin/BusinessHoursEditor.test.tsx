import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BusinessHoursEditor } from "./BusinessHoursEditor";

const businessState = vi.hoisted(() => ({
  value: { businessId: "biz-1" },
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const firestoreState = vi.hoisted(() => ({
  hours: [] as any[],
  overrides: [] as any[],
  links: [] as any[],
  deleted: [] as any[],
  sets: [] as Array<{ ref: any; payload: any }>,
  commitMock: vi.fn(),
  autoDocId: 0,
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => {
    const items = Array.isArray(children) ? children.flat(Infinity) : [children];
    const options = items
      .filter((child: any) => child?.props?.["data-select-item"] === "true")
      .map((child: any) => ({
        value: child.props["data-value"],
        label: child.props.children,
      }));

    return (
      <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
  SelectValue: () => null,
}));

vi.mock("firebase/firestore", () => {
  const makeSnapshot = (items: any[]) => ({
    empty: items.length === 0,
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
  });

  const getCollectionItems = (collectionName: string) => {
    if (collectionName === "business_hours") return firestoreState.hours;
    if (collectionName === "business_date_overrides") return firestoreState.overrides;
    if (collectionName === "business_quick_links") return firestoreState.links;
    return [];
  };

  return {
    collection: (_db: unknown, name: string) => ({ __collection: name, constraints: [] }),
    where: (field: string, op: string, value: unknown) => ({ type: "where", field, op, value }),
    orderBy: (field: string) => ({ type: "orderBy", field }),
    query: (base: any, ...constraints: any[]) => ({
      __collection: base?.__collection,
      constraints: [...(base?.constraints ?? []), ...constraints],
    }),
    getDocs: vi.fn(async (input: any) => makeSnapshot(getCollectionItems(input?.__collection ?? "unknown"))),
    doc: (...args: any[]) => {
      if (args.length === 1 && args[0]?.__collection) {
        firestoreState.autoDocId += 1;
        return { __collection: args[0].__collection, id: `auto-${firestoreState.autoDocId}` };
      }

      return { __collection: args[1], id: args[2] };
    },
    writeBatch: () => ({
      delete: (ref: any) => {
        firestoreState.deleted.push(ref);
      },
      set: (ref: any, payload: any) => {
        firestoreState.sets.push({ ref, payload });
      },
      commit: firestoreState.commitMock,
    }),
  };
});

describe("BusinessHoursEditor", () => {
  beforeEach(() => {
    businessState.value = { businessId: "biz-1" };
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();

    firestoreState.hours = [];
    firestoreState.overrides = [];
    firestoreState.links = [];
    firestoreState.deleted = [];
    firestoreState.sets = [];
    firestoreState.autoDocId = 0;
    firestoreState.commitMock.mockReset();
    firestoreState.commitMock.mockResolvedValue(undefined);
  });

  it("loads default weekly hours when firestore returns no saved rows", async () => {
    render(<BusinessHoursEditor />);

    expect(await screen.findByText("Týždenné otváracie hodiny")).toBeInTheDocument();
    expect(screen.getByText("Pondelok")).toBeInTheDocument();
    expect(screen.getByText("Nedeľa")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("09:00")).toHaveLength(6);
    expect(screen.getAllByDisplayValue("17:00")).toHaveLength(6);
    expect(screen.getByText("Žiadne aktívne výnimky")).toBeInTheDocument();
    expect(screen.getByText("Žiadne odkazy")).toBeInTheDocument();
  });

  it("renders firestore-backed overrides and quick links", async () => {
    firestoreState.hours = [
      { id: "h1", day_of_week: "monday", mode: "open", start_time: "08:00:00", end_time: "16:00:00", sort_order: 0 },
    ];
    firestoreState.overrides = [
      { id: "o1", override_date: "2026-12-24", mode: "open", start_time: "10:00:00", end_time: "14:00:00", label: "Štedrý deň" },
    ];
    firestoreState.links = [
      { id: "l1", label: "Cenník", url: "https://example.com/prices", sort_order: 0 },
    ];

    render(<BusinessHoursEditor />);

    expect(await screen.findByDisplayValue("2026-12-24")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Štedrý deň")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cenník")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/prices")).toBeInTheDocument();
  });

  it("adds override and link rows from CTA buttons", async () => {
    const realDate = Date;
    const fixedNow = new realDate("2026-03-13T09:00:00.000Z");
    vi.stubGlobal(
      "Date",
      class extends realDate {
        constructor(value?: any) {
          super(value ?? fixedNow);
        }

        static now() {
          return fixedNow.getTime();
        }
      } as DateConstructor,
    );

    render(<BusinessHoursEditor />);
    await screen.findByText("Výnimky");

    fireEvent.click(screen.getByRole("button", { name: /Pridať výnimku/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pridať odkaz/i }));

    expect(screen.getByDisplayValue("2026-03-13")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dôvod (napr. Sviatok)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Názov (napr. Cenník)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("saves hours, overrides and links and normalizes closed override times", async () => {
    firestoreState.hours = [
      { id: "h1", day_of_week: "monday", mode: "open", start_time: "08:00:00", end_time: "16:00:00", sort_order: 0 },
    ];
    firestoreState.overrides = [
      { id: "o1", override_date: "2026-12-24", mode: "closed", start_time: "10:00:00", end_time: "14:00:00", label: "Voľno" },
    ];
    firestoreState.links = [
      { id: "l1", label: "Starý link", url: "https://example.com/old", sort_order: 0 },
    ];

    render(<BusinessHoursEditor />);
    await screen.findByText("Rýchle odkazy");

    fireEvent.click(screen.getByRole("button", { name: /Pridať odkaz/i }));
    fireEvent.change(screen.getAllByPlaceholderText("Názov (napr. Cenník)")[1], { target: { value: "Kalendár" } });
    fireEvent.change(screen.getAllByPlaceholderText("https://...")[1], { target: { value: "https://example.com/calendar" } });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť všetky nastavenia hodín/i }));

    await waitFor(() => expect(firestoreState.commitMock).toHaveBeenCalledTimes(1));

    expect(toastMocks.success).toHaveBeenCalledWith("Otváracie hodiny uložené");
    expect(firestoreState.deleted).toHaveLength(3);
    expect(firestoreState.sets.some(({ ref }) => ref.__collection === "business_hours")).toBe(true);

    const overrideWrite = firestoreState.sets.find(({ ref }) => ref.__collection === "business_date_overrides");
    expect(overrideWrite?.payload).toMatchObject({
      business_id: "biz-1",
      override_date: "2026-12-24",
      mode: "closed",
      start_time: null,
      end_time: null,
      label: "Voľno",
    });

    const quickLinkWrites = firestoreState.sets.filter(({ ref }) => ref.__collection === "business_quick_links");
    expect(quickLinkWrites).toHaveLength(2);
    expect(quickLinkWrites.map(({ payload }) => payload.sort_order)).toEqual([0, 1]);
  });

  it("shows toast error when save fails", async () => {
    firestoreState.commitMock.mockRejectedValueOnce(new Error("commit failed"));

    render(<BusinessHoursEditor />);
    await screen.findByText("Týždenné otváracie hodiny");
    fireEvent.click(screen.getByRole("button", { name: /Uložiť všetky nastavenia hodín/i }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("commit failed"));
  });
});
