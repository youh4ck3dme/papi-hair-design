import { describe, expect, it } from "vitest";
import {
  buildObservabilityAlerts,
  getObservabilityHealthLabel,
  getObservabilityHealthTone,
} from "./adminObservability";

describe("adminObservability", () => {
  it("marks missing snapshot as an error", () => {
    const alerts = buildObservabilityAlerts(null, null, null, new Date("2026-04-16T10:00:00.000Z"));

    expect(alerts[0]?.title).toBe("Chýba public snapshot");
    expect(getObservabilityHealthTone(alerts)).toBe("error");
    expect(getObservabilityHealthLabel(getObservabilityHealthTone(alerts))).toBe("Vyžaduje zásah");
  });

  it("marks stale and slow snapshot health as warning", () => {
    const alerts = buildObservabilityAlerts(
      {
        status: "ready",
        updated_at: "2026-04-10T10:00:00.000Z",
      },
      {
        status: "ready",
        updated_at: "2026-04-10T10:00:00.000Z",
        last_success_at: "2026-04-10T10:00:00.000Z",
        duration_ms: 6000,
        service_count: 33,
        subcategory_count: 14,
      },
      {
        total_events: 8,
        last_event_at: "2026-04-15T10:00:00.000Z",
        last_event_name: "service_selected",
      },
      new Date("2026-04-16T10:00:00.000Z"),
    );

    expect(alerts.map((alert) => alert.title)).toContain("Snapshot je starý");
    expect(alerts.map((alert) => alert.title)).toContain("Snapshot rebuild je pomalý");
    expect(getObservabilityHealthTone(alerts)).toBe("warning");
  });

  it("keeps healthy status when snapshot and funnel look good", () => {
    const alerts = buildObservabilityAlerts(
      {
        status: "ready",
        updated_at: "2026-04-16T09:55:00.000Z",
      },
      {
        status: "ready",
        updated_at: "2026-04-16T09:55:00.000Z",
        last_success_at: "2026-04-16T09:55:00.000Z",
        duration_ms: 250,
        service_count: 33,
        subcategory_count: 14,
      },
      {
        total_events: 18,
        last_event_at: "2026-04-16T09:58:00.000Z",
        last_event_name: "booking_started",
      },
      new Date("2026-04-16T10:00:00.000Z"),
    );

    expect(alerts).toEqual([]);
    expect(getObservabilityHealthTone(alerts)).toBe("healthy");
    expect(getObservabilityHealthLabel("healthy")).toBe("Zdravé");
  });
});
