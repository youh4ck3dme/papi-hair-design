import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAvailability } from "./useAvailability";
import type { BusinessHourEntry, DateOverrideEntry } from "@/lib/availability";

vi.mock("@/integrations/firebase/getPublicAvailabilityConflicts", () => ({
  getPublicAvailabilityConflicts: vi.fn().mockResolvedValue([]),
}));

const makeService = () => ({
  id: "svc-1",
  name_sk: "Strih",
  description_sk: null,
  price: 20,
  duration_minutes: 30,
  buffer_minutes: 0,
  is_active: true,
  business_id: "biz-1",
  category: "damske" as const,
  subcategory: null,
});

const makeEmployee = () => ({
  id: "emp-1",
  display_name: "Anna",
  email: null,
  phone: null,
  is_active: true,
  business_id: "biz-1",
  photo_url: null,
  profile_id: null,
  service_mode: "all" as const,
});

const businessHourEntries: BusinessHourEntry[] = [
  { day_of_week: "monday", mode: "open", open_time: "08:00", close_time: "17:00" },
  { day_of_week: "tuesday", mode: "open", open_time: "08:00", close_time: "17:00" },
  { day_of_week: "wednesday", mode: "open", open_time: "08:00", close_time: "17:00" },
  { day_of_week: "thursday", mode: "open", open_time: "08:00", close_time: "17:00" },
  { day_of_week: "friday", mode: "open", open_time: "08:00", close_time: "17:00" },
  { day_of_week: "saturday", mode: "closed", open_time: null, close_time: null },
  { day_of_week: "sunday", mode: "closed", open_time: null, close_time: null },
];

const business = { id: "biz-1", max_days_ahead: 60, lead_time_minutes: 0 };

describe("useAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with selectedDate null", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    expect(result.current.selectedDate).toBeNull();
  });

  it("initializes with selectedTime null", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    expect(result.current.selectedTime).toBeNull();
  });

  it("selectedFullDate is null when no date selected", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    expect(result.current.selectedFullDate).toBeNull();
  });

  it("setSelectedDate updates selectedDate", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    act(() => {
      result.current.setSelectedDate(15);
    });
    expect(result.current.selectedDate).toBe(15);
  });

  it("setSelectedTime updates selectedTime", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    act(() => {
      result.current.setSelectedTime("10:00");
    });
    expect(result.current.selectedTime).toBe("10:00");
  });

  it("isBusinessOpenOnDay returns false for Sunday with closed hours", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    // Find a Sunday — 2026-04-19 is a Sunday
    const sunday = new Date(2026, 3, 19);
    expect(result.current.isBusinessOpenOnDay(sunday)).toBe(false);
  });

  it("isBusinessOpenOnDay returns true for Monday with open hours", () => {
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, [], {}, makeService(), [makeEmployee()])
    );
    // 2026-04-20 is a Monday
    const monday = new Date(2026, 3, 20);
    expect(result.current.isBusinessOpenOnDay(monday)).toBe(true);
  });

  it("date override closed overrides normally open weekday", () => {
    const overrides: DateOverrideEntry[] = [
      { date: "2026-04-20", mode: "closed", open_time: null, close_time: null },
    ];
    const { result } = renderHook(() =>
      useAvailability(business, businessHourEntries, overrides, {}, makeService(), [makeEmployee()])
    );
    const monday = new Date(2026, 3, 20);
    expect(result.current.isBusinessOpenOnDay(monday)).toBe(false);
  });
});
