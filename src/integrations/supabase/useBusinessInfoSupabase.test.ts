/**
 * Testy pre useBusinessInfoSupabase hook.
 * Supabase klient je plne mocknutý – žiadne HTTP volania.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { useBusinessInfoSupabase } from "./useBusinessInfoSupabase";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a chainable Supabase query mock that resolves with {data, error}. */
function makeQuery(data: unknown, error: unknown = null) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "gte", "single"];
  methods.forEach((m) => {
    q[m] = (..._args: unknown[]) => q;
  });
  q.then = (resolve: (v: unknown) => void) => resolve({ data, error });
  return q;
}

const BUSINESS_ID = "biz-001";

const MOCK_BIZ = {
  id: BUSINESS_ID,
  name: "Papi Hair Design",
  slug: "papi-hair",
  address: "Hlavná 1, Bratislava",
  phone: "+421900000001",
  email: "info@papi.sk",
  timezone: "Europe/Bratislava",
  logo_url: null,
  lead_time_minutes: 30,
  max_days_ahead: 60,
  cancellation_hours: 24,
  allow_admin_as_provider: false,
  opening_hours: {},
};

const MOCK_HOURS = [
  { day_of_week: "monday", mode: "open", start_time: "09:00", end_time: "18:00", sort_order: 1 },
  { day_of_week: "tuesday", mode: "open", start_time: "09:00", end_time: "18:00", sort_order: 2 },
  { day_of_week: "saturday", mode: "closed", start_time: "00:00", end_time: "00:00", sort_order: 6 },
  { day_of_week: "sunday", mode: "closed", start_time: "00:00", end_time: "00:00", sort_order: 7 },
];

const MOCK_OVERRIDES = [
  {
    override_date: "2026-12-24",
    mode: "closed",
    start_time: null,
    end_time: null,
    label: "Vigília",
  },
];

const MOCK_LINKS = [
  { id: "l1", label: "Instagram", url: "https://instagram.com/papi", sort_order: 1 },
];

function setupMocks(
  bizData = MOCK_BIZ,
  bizError: unknown = null,
  hours = MOCK_HOURS,
  overrides = MOCK_OVERRIDES,
  links = MOCK_LINKS,
) {
  let callIndex = 0;
  const datasets = [
    { data: bizData, error: bizError },
    { data: hours, error: null },
    { data: overrides, error: null },
    { data: links, error: null },
  ];
  mockFrom.mockImplementation(() => makeQuery(
    datasets[callIndex]?.data,
    datasets[callIndex++]?.error,
  ));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useBusinessInfoSupabase", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("starts in loading state", () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    expect(result.current.loading).toBe(true);
    expect(result.current.info).toBeNull();
  });

  it("populates info after successful load", async () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info).not.toBeNull();
    expect(result.current.info!.business.name).toBe("Papi Hair Design");
    expect(result.current.info!.business.timezone).toBe("Europe/Bratislava");
    expect(result.current.info!.business.allow_admin_as_provider).toBe(false);
  });

  it("maps hours correctly", async () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mondayHour = result.current.info!.hours.find((h) => h.day_of_week === "monday");
    expect(mondayHour).toBeDefined();
    expect(mondayHour!.mode).toBe("open");
    expect(mondayHour!.start_time).toBe("09:00");
  });

  it("maps overrides correctly", async () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info!.overrides).toHaveLength(1);
    expect(result.current.info!.overrides[0].override_date).toBe("2026-12-24");
    expect(result.current.info!.overrides[0].mode).toBe("closed");
    expect(result.current.info!.overrides[0].label).toBe("Vigília");
  });

  it("maps quick_links correctly", async () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info!.quick_links).toHaveLength(1);
    expect(result.current.info!.quick_links[0].label).toBe("Instagram");
  });

  it("returns null info when business fetch fails", async () => {
    setupMocks(null as any, { message: "not found" });
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info).toBeNull();
  });

  it("returns null info when businessId is empty string", async () => {
    const { result } = renderHook(() => useBusinessInfoSupabase(""));
    // Hook should not trigger load
    expect(result.current.loading).toBe(true); // still in initial true state (no fetch done)
    expect(result.current.info).toBeNull();
  });

  it("returns openStatus with is_open boolean", async () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.openStatus).not.toBeNull();
    expect(typeof result.current.openStatus!.is_open).toBe("boolean");
    expect(["open", "closed", "on_request"]).toContain(result.current.openStatus!.mode);
  });

  it("returns nextOpening or null", async () => {
    setupMocks();
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // nextOpening is either null or has date/time/datetime fields
    if (result.current.nextOpening !== null) {
      expect(result.current.nextOpening).toHaveProperty("date");
      expect(result.current.nextOpening).toHaveProperty("time");
      expect(result.current.nextOpening).toHaveProperty("datetime");
    }
  });

  it("uses Europe/Bratislava timezone as default when not set", async () => {
    const bizWithoutTz = { ...MOCK_BIZ, timezone: undefined };
    setupMocks(bizWithoutTz as any);
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info!.business.timezone).toBe("Europe/Bratislava");
  });

  it("handles empty hours and overrides gracefully", async () => {
    setupMocks(MOCK_BIZ, null, [], [], []);
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info!.hours).toHaveLength(0);
    expect(result.current.info!.overrides).toHaveLength(0);
    expect(result.current.info!.quick_links).toHaveLength(0);
    // Closed business → is_open should be false
    expect(result.current.openStatus!.is_open).toBe(false);
    // nextOpening should be null (no hours configured)
    expect(result.current.nextOpening).toBeNull();
  });

  it("on_request mode reflects in openStatus", async () => {
    const onRequestHours = [
      { day_of_week: "monday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 1 },
      { day_of_week: "tuesday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 2 },
      { day_of_week: "wednesday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 3 },
      { day_of_week: "thursday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 4 },
      { day_of_week: "friday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 5 },
      { day_of_week: "saturday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 6 },
      { day_of_week: "sunday", mode: "on_request", start_time: "09:00", end_time: "18:00", sort_order: 7 },
    ];
    setupMocks(MOCK_BIZ, null, onRequestHours, [], []);
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // on_request means is_open = false
    expect(result.current.openStatus!.is_open).toBe(false);
    expect(result.current.openStatus!.mode).toBe("on_request");
  });

  it("closed override makes business report as closed today", async () => {
    // Override for today
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bratislava" });
    const overridesWithToday = [
      { override_date: todayStr, mode: "closed", start_time: null, end_time: null, label: "Zatvorené" },
    ];
    const allOpenHours = [
      { day_of_week: "monday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 1 },
      { day_of_week: "tuesday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 2 },
      { day_of_week: "wednesday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 3 },
      { day_of_week: "thursday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 4 },
      { day_of_week: "friday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 5 },
      { day_of_week: "saturday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 6 },
      { day_of_week: "sunday", mode: "open", start_time: "08:00", end_time: "20:00", sort_order: 7 },
    ];
    setupMocks(MOCK_BIZ, null, allOpenHours, overridesWithToday, []);
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.openStatus!.is_open).toBe(false);
    expect(result.current.openStatus!.mode).toBe("closed");
  });

  it("lead_time_minutes defaults to 0 when not in DB", async () => {
    const bizNoLead = { ...MOCK_BIZ, lead_time_minutes: undefined };
    setupMocks(bizNoLead as any);
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info!.business.lead_time_minutes).toBe(0);
  });

  it("max_days_ahead defaults to 365 when not in DB", async () => {
    const bizNoMax = { ...MOCK_BIZ, max_days_ahead: undefined };
    setupMocks(bizNoMax as any);
    const { result } = renderHook(() => useBusinessInfoSupabase(BUSINESS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.info!.business.max_days_ahead).toBe(365);
  });
});
