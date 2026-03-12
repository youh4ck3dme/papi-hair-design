import { describe, expect, it } from "vitest";
import {
  buildBookingStatusUpdate,
  ensureAllowedAdminTransition,
} from "../src/bookingStatus";

describe("bookingStatus", () => {
  it("allows valid admin transitions", () => {
    expect(() => ensureAllowedAdminTransition("pending", "confirmed")).not.toThrow();
    expect(() => ensureAllowedAdminTransition("confirmed", "completed")).not.toThrow();
    expect(() => ensureAllowedAdminTransition("confirmed", "cancelled")).not.toThrow();
  });

  it("rejects invalid admin transitions", () => {
    expect(() => ensureAllowedAdminTransition("completed", "confirmed")).toThrow();
    expect(() => ensureAllowedAdminTransition("cancelled", "pending")).toThrow();
  });

  it("builds timestamp fields for terminal states", () => {
    expect(buildBookingStatusUpdate("cancelled", "2026-03-12T10:00:00.000Z")).toMatchObject({
      status: "cancelled",
      cancelled_at: "2026-03-12T10:00:00.000Z",
    });
  });
});
