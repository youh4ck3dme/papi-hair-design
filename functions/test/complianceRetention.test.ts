import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  buildRetentionCutoff,
  COMPLIANCE_RETENTION_POLICIES,
  cutoffIsoFromDays,
  cutoffMillisFromHours,
  cutoffTimestampFromDays,
} from "../src/complianceRetention";

describe("complianceRetention", () => {
  it("builds ISO cutoffs from day-based policies", () => {
    const now = new Date("2026-04-22T10:00:00.000Z");
    expect(cutoffIsoFromDays(30, now)).toBe("2026-03-23T10:00:00.000Z");
  });

  it("builds timestamp cutoffs from day-based policies", () => {
    const now = new Date("2026-04-22T10:00:00.000Z");
    expect(cutoffTimestampFromDays(365, now).toMillis()).toBe(
      Timestamp.fromDate(new Date("2025-04-22T10:00:00.000Z")).toMillis(),
    );
  });

  it("builds epoch-millis cutoffs from hour-based policies", () => {
    const now = new Date("2026-04-22T10:00:00.000Z");
    expect(cutoffMillisFromHours(24, now)).toBe(new Date("2026-04-21T10:00:00.000Z").getTime());
  });

  it("uses grace periods for expiring access tokens", () => {
    const policy = COMPLIANCE_RETENTION_POLICIES.find((item) => item.key === "booking-claims");
    expect(policy).toBeDefined();

    const cutoff = buildRetentionCutoff(policy!, new Date("2026-04-22T10:00:00.000Z"));
    expect(cutoff).toBe("2026-03-23T10:00:00.000Z");
  });

  it("uses timestamp cutoffs for timestamp-backed audit collections", () => {
    const policy = COMPLIANCE_RETENTION_POLICIES.find((item) => item.key === "calendar-action-audit");
    expect(policy).toBeDefined();

    const cutoff = buildRetentionCutoff(policy!, new Date("2026-04-22T10:00:00.000Z"));
    expect(cutoff).toBeInstanceOf(Timestamp);
    expect((cutoff as Timestamp).toMillis()).toBe(
      Timestamp.fromDate(new Date("2025-04-22T10:00:00.000Z")).toMillis(),
    );
  });
});
