import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useBusinessInfo } from "./useBusinessInfo";

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();

vi.mock("@/integrations/firebase/config", () => ({
  auth: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn().mockResolvedValue({}),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

const makeBusinessDoc = (overrides = {}) => ({
  exists: () => true,
  data: () => ({
    name: "PAPI HAIR DESIGN",
    slug: "papihairdesign",
    address: "Hlavná 1, Košice",
    phone: "+421 900 000 000",
    email: "info@phd.sk",
    timezone: "Europe/Bratislava",
    logo_url: null,
    lead_time_minutes: 60,
    max_days_ahead: 60,
    cancellation_hours: 24,
    allow_admin_as_provider: true,
    opening_hours: {},
    ...overrides,
  }),
});

const makeQuerySnapshot = (docs: object[] = []) => ({
  docs: docs.map((data) => ({ data: () => data, id: "row-1" })),
});

describe("useBusinessInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue(makeBusinessDoc());
    mockGetDocs.mockResolvedValue(makeQuerySnapshot());
  });

  it("starts with info null while loading", () => {
    mockGetDoc.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useBusinessInfo("biz-1"));
    expect(result.current.info).toBeNull();
  });

  it("resolves business name after load", async () => {
    const { result } = renderHook(() => useBusinessInfo("biz-1"));
    await waitFor(() => {
      expect(result.current.info).not.toBeNull();
    });
    expect(result.current.info?.business.name).toBe("PAPI HAIR DESIGN");
  });

  it("resolves business address", async () => {
    const { result } = renderHook(() => useBusinessInfo("biz-1"));
    await waitFor(() => expect(result.current.info).not.toBeNull());
    expect(result.current.info?.business.address).toBe("Hlavná 1, Košice");
  });

  it("returns empty services array when no services in DB", async () => {
    mockGetDocs.mockResolvedValue(makeQuerySnapshot());
    const { result } = renderHook(() => useBusinessInfo("biz-1"));
    await waitFor(() => expect(result.current.info).not.toBeNull());
    expect(result.current.info?.services).toEqual([]);
  });

  it("returns services from DB snapshot", async () => {
    mockGetDocs.mockResolvedValue(
      makeQuerySnapshot([{ name_sk: "Dámsky strih", price: 25, sort_order: 1 }])
    );
    const { result } = renderHook(() => useBusinessInfo("biz-1"));
    await waitFor(() => expect(result.current.info).not.toBeNull());
    expect(result.current.info?.services[0]?.name_sk).toBe("Dámsky strih");
  });

  it("sets openStatus after load", async () => {
    const { result } = renderHook(() => useBusinessInfo("biz-1"));
    await waitFor(() => expect(result.current.info).not.toBeNull());
    expect(result.current.openStatus).toBeDefined();
    expect(typeof result.current.openStatus?.is_open).toBe("boolean");
  });
});
