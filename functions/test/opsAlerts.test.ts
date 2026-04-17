import { describe, expect, it } from "vitest";
import { buildActiveOpsAlerts, buildOpsAlertSyncPlan } from "../src/opsAlerts";

describe("buildActiveOpsAlerts", () => {
  it("creates actionable alerts for failed and stale snapshot states", () => {
    const alerts = buildActiveOpsAlerts(
      {
        status: "draft",
        updated_at: "2026-04-10T10:00:00.000Z",
      },
      {
        status: "failed",
        error: "Index build failed",
        updated_at: "2026-04-10T10:00:00.000Z",
        last_success_at: "2026-04-10T10:00:00.000Z",
        duration_ms: 6_200,
        service_count: 0,
        subcategory_count: 0,
      },
      {
        total_events: 4,
        last_event_at: "2026-03-01T10:00:00.000Z",
      },
      new Date("2026-04-16T10:00:00.000Z"),
    );

    expect(alerts.map((alert) => alert.code)).toEqual([
      "snapshot_not_ready",
      "snapshot_rebuild_failed",
      "snapshot_no_services",
      "snapshot_stale",
      "snapshot_slow",
      "snapshot_no_subcategories",
      "funnel_stale",
    ]);
  });

  it("returns no actionable alerts for healthy snapshot and funnel data", () => {
    const alerts = buildActiveOpsAlerts(
      {
        status: "ready",
        updated_at: "2026-04-16T09:59:00.000Z",
      },
      {
        status: "ready",
        updated_at: "2026-04-16T09:59:00.000Z",
        last_success_at: "2026-04-16T09:59:00.000Z",
        duration_ms: 320,
        service_count: 33,
        subcategory_count: 14,
      },
      {
        total_events: 18,
        last_event_at: "2026-04-16T09:58:00.000Z",
      },
      new Date("2026-04-16T10:00:00.000Z"),
    );

    expect(alerts).toEqual([]);
  });
});

describe("buildOpsAlertSyncPlan", () => {
  it("preserves first_detected_at for ongoing active alerts and resolves missing alerts", () => {
    const plan = buildOpsAlertSyncPlan(
      [
        {
          id: "biz-1__snapshot_stale",
          code: "snapshot_stale",
          status: "active",
          first_detected_at: "2026-04-15T10:00:00.000Z",
        },
        {
          id: "biz-1__snapshot_slow",
          code: "snapshot_slow",
          status: "active",
          first_detected_at: "2026-04-15T09:00:00.000Z",
        },
      ],
      [
        {
          code: "snapshot_stale",
          severity: "warning",
          source_kind: "snapshot",
          title: "Snapshot je starý",
          description: "Posledný úspešný snapshot je starý 120 h.",
          metadata: {
            age_hours: 120,
          },
        },
      ],
      "biz-1",
      "2026-04-16T10:00:00.000Z",
      "scheduler",
    );

    expect(plan.upserts).toHaveLength(1);
    expect(plan.upserts[0]).toEqual({
      id: "biz-1__snapshot_stale",
      data: expect.objectContaining({
        status: "active",
        first_detected_at: "2026-04-15T10:00:00.000Z",
        last_detected_at: "2026-04-16T10:00:00.000Z",
      }),
    });

    expect(plan.resolves).toEqual([
      {
        id: "biz-1__snapshot_slow",
        data: {
          status: "resolved",
          resolved_at: "2026-04-16T10:00:00.000Z",
          updated_at: "2026-04-16T10:00:00.000Z",
          last_sync_source: "scheduler",
        },
      },
    ]);
  });

  it("restarts first_detected_at when a resolved alert becomes active again", () => {
    const plan = buildOpsAlertSyncPlan(
      [
        {
          id: "biz-1__snapshot_stale",
          code: "snapshot_stale",
          status: "resolved",
          first_detected_at: "2026-04-10T10:00:00.000Z",
        },
      ],
      [
        {
          code: "snapshot_stale",
          severity: "warning",
          source_kind: "snapshot",
          title: "Snapshot je starý",
          description: "Posledný úspešný snapshot je starý 96 h.",
          metadata: {
            age_hours: 96,
          },
        },
      ],
      "biz-1",
      "2026-04-16T10:00:00.000Z",
      "callable",
    );

    expect(plan.upserts[0]?.data.first_detected_at).toBe("2026-04-16T10:00:00.000Z");
    expect(plan.resolves).toEqual([]);
  });
});
