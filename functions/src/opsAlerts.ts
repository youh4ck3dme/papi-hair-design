import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, type CallableRequest, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

type OpsAlertSeverity = "error" | "warning";
type OpsAlertStatus = "active" | "resolved";
type OpsAlertSourceKind = "snapshot" | "booking_funnel";

interface SnapshotInfoLike {
  status?: string | null;
  updated_at?: string | null;
}

interface SnapshotHealthLike {
  status?: string | null;
  error?: string | null;
  updated_at?: string | null;
  last_success_at?: string | null;
  duration_ms?: number | null;
  service_count?: number | null;
  subcategory_count?: number | null;
}

interface BookingFunnelHealthLike {
  total_events?: number | null;
  last_event_at?: string | null;
}

interface DerivedOpsAlert {
  code: string;
  severity: OpsAlertSeverity;
  source_kind: OpsAlertSourceKind;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

interface ExistingOpsAlert {
  id: string;
  code?: string | null;
  status?: OpsAlertStatus | null;
  first_detected_at?: string | null;
}

interface OpsAlertWrite {
  id: string;
  data: Record<string, unknown>;
}

interface OpsAlertSyncPlan {
  upserts: OpsAlertWrite[];
  resolves: OpsAlertWrite[];
}

interface ObservabilitySources {
  snapshotInfo: SnapshotInfoLike | null;
  snapshotHealth: SnapshotHealthLike | null;
  bookingFunnelHealth: BookingFunnelHealthLike | null;
}

const STALE_SNAPSHOT_HOURS = 72;
const SLOW_SNAPSHOT_MS = 5_000;
const STALE_FUNNEL_DAYS = 14;

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffHours(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildAlertDocId(businessId: string, code: string): string {
  return `${businessId}__${code}`;
}

export function buildActiveOpsAlerts(
  snapshotInfo: SnapshotInfoLike | null | undefined,
  snapshotHealth: SnapshotHealthLike | null | undefined,
  bookingFunnelHealth: BookingFunnelHealthLike | null | undefined,
  now: Date = new Date(),
): DerivedOpsAlert[] {
  const alerts: DerivedOpsAlert[] = [];

  if (!snapshotInfo) {
    alerts.push({
      code: "missing_public_snapshot",
      severity: "error",
      source_kind: "snapshot",
      title: "Chýba public snapshot",
      description: "Booking frontend nemá načítaný public snapshot dokument pre aktuálnu firmu.",
      metadata: {},
    });
  } else if (snapshotInfo.status && snapshotInfo.status !== "ready") {
    alerts.push({
      code: "snapshot_not_ready",
      severity: "error",
      source_kind: "snapshot",
      title: "Snapshot nie je ready",
      description: `Aktuálny snapshot je v stave "${snapshotInfo.status}".`,
      metadata: {
        snapshot_status: snapshotInfo.status,
      },
    });
  }

  if (!snapshotHealth) {
    alerts.push({
      code: "missing_snapshot_health",
      severity: "warning",
      source_kind: "snapshot",
      title: "Chýba ops health pre snapshot",
      description: "Systém ešte nevytvoril health dokument pre public snapshot.",
      metadata: {},
    });
  } else {
    if (snapshotHealth.status === "failed" || Boolean(snapshotHealth.error)) {
      alerts.push({
        code: "snapshot_rebuild_failed",
        severity: "error",
        source_kind: "snapshot",
        title: "Posledný snapshot rebuild zlyhal",
        description: snapshotHealth.error || "Skontrolujte históriu rebuild eventov a opravte root cause.",
        metadata: {
          snapshot_status: snapshotHealth.status ?? null,
          error: snapshotHealth.error ?? null,
        },
      });
    }

    const latestSnapshotTime =
      parseTimestamp(snapshotHealth.last_success_at) ??
      parseTimestamp(snapshotHealth.updated_at) ??
      parseTimestamp(snapshotInfo?.updated_at);

    if (latestSnapshotTime) {
      const ageHours = diffHours(latestSnapshotTime, now);
      if (ageHours >= STALE_SNAPSHOT_HOURS) {
        alerts.push({
          code: "snapshot_stale",
          severity: "warning",
          source_kind: "snapshot",
          title: "Snapshot je starý",
          description: `Posledný úspešný snapshot je starý ${ageHours} h.`,
          metadata: {
            age_hours: ageHours,
          },
        });
      }
    }

    if (typeof snapshotHealth.duration_ms === "number" && snapshotHealth.duration_ms >= SLOW_SNAPSHOT_MS) {
      alerts.push({
        code: "snapshot_slow",
        severity: "warning",
        source_kind: "snapshot",
        title: "Snapshot rebuild je pomalý",
        description: `Posledný rebuild trval ${snapshotHealth.duration_ms} ms.`,
        metadata: {
          duration_ms: snapshotHealth.duration_ms,
        },
      });
    }

    if (snapshotHealth.service_count === 0) {
      alerts.push({
        code: "snapshot_no_services",
        severity: "error",
        source_kind: "snapshot",
        title: "Snapshot nemá služby",
        description: "Public snapshot obsahuje 0 služieb, booking flow by bol nefunkčný.",
        metadata: {},
      });
    }

    if (snapshotHealth.subcategory_count === 0) {
      alerts.push({
        code: "snapshot_no_subcategories",
        severity: "warning",
        source_kind: "snapshot",
        title: "Snapshot nemá podkategórie",
        description: "Public snapshot neobsahuje service subcategories pre booking výber.",
        metadata: {},
      });
    }
  }

  const totalEvents = typeof bookingFunnelHealth?.total_events === "number" ? bookingFunnelHealth.total_events : 0;
  const lastEventAt = parseTimestamp(bookingFunnelHealth?.last_event_at);
  if (lastEventAt && totalEvents > 0) {
    const ageDays = diffDays(lastEventAt, now);
    if (ageDays >= STALE_FUNNEL_DAYS) {
      alerts.push({
        code: "funnel_stale",
        severity: "warning",
        source_kind: "booking_funnel",
        title: "Booking funnel je neaktívny",
        description: `Posledný funnel event je starý ${ageDays} dní.`,
        metadata: {
          age_days: ageDays,
          total_events: totalEvents,
        },
      });
    }
  }

  const severityOrder: Record<OpsAlertSeverity, number> = {
    error: 0,
    warning: 1,
  };

  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function buildOpsAlertSyncPlan(
  existingAlerts: ExistingOpsAlert[],
  currentAlerts: DerivedOpsAlert[],
  businessId: string,
  nowIso: string,
  source: string,
): OpsAlertSyncPlan {
  const existingByCode = new Map<string, ExistingOpsAlert>();
  for (const alert of existingAlerts) {
    const code = nonEmptyString(alert.code);
    if (code) {
      existingByCode.set(code, alert);
    }
  }

  const currentCodes = new Set(currentAlerts.map((alert) => alert.code));
  const upserts: OpsAlertWrite[] = currentAlerts.map((alert) => {
    const existing = existingByCode.get(alert.code);
    const firstDetectedAt =
      existing?.status === "active" && nonEmptyString(existing.first_detected_at)
        ? existing.first_detected_at
        : nowIso;

    return {
      id: buildAlertDocId(businessId, alert.code),
      data: {
        alert_id: alert.code,
        business_id: businessId,
        code: alert.code,
        severity: alert.severity,
        source_kind: alert.source_kind,
        title: alert.title,
        description: alert.description,
        metadata: alert.metadata,
        status: "active" satisfies OpsAlertStatus,
        first_detected_at: firstDetectedAt,
        last_detected_at: nowIso,
        resolved_at: null,
        updated_at: nowIso,
        last_sync_source: source,
      },
    };
  });

  const resolves: OpsAlertWrite[] = existingAlerts
    .filter((alert) => {
      const code = nonEmptyString(alert.code);
      if (alert.status !== "active" || !code) return false;
      return !currentCodes.has(code) || alert.id !== buildAlertDocId(businessId, code);
    })
    .map((alert) => ({
      id: alert.id,
      data: {
        status: "resolved" satisfies OpsAlertStatus,
        resolved_at: nowIso,
        updated_at: nowIso,
        last_sync_source: source,
      },
    }));

  return { upserts, resolves };
}

async function loadObservabilitySources(db: Firestore, businessId: string): Promise<ObservabilitySources> {
  const [snapshotInfoSnap, snapshotHealthSnap, bookingFunnelHealthSnap] = await Promise.all([
    db.collection("public_snapshots").doc(businessId).get(),
    db.collection("ops_health").doc(`snapshot_${businessId}`).get(),
    db.collection("ops_health").doc(`booking_funnel_${businessId}`).get(),
  ]);

  return {
    snapshotInfo: snapshotInfoSnap.exists ? (snapshotInfoSnap.data() as SnapshotInfoLike) : null,
    snapshotHealth: snapshotHealthSnap.exists ? (snapshotHealthSnap.data() as SnapshotHealthLike) : null,
    bookingFunnelHealth: bookingFunnelHealthSnap.exists ? (bookingFunnelHealthSnap.data() as BookingFunnelHealthLike) : null,
  };
}

async function ensureOwnerOrAdmin(db: Firestore, businessId: string, uid: string) {
  const membershipSnap = await db
    .collection("memberships")
    .where("business_id", "==", businessId)
    .where("profile_id", "==", uid)
    .limit(1)
    .get();

  const role = membershipSnap.empty ? "" : nonEmptyString(membershipSnap.docs[0].data().role) ?? "";
  if (membershipSnap.empty || (role !== "owner" && role !== "admin")) {
    throw new HttpsError("permission-denied", "Forbidden");
  }
}

function resolveHealthBusinessId(
  healthId: string,
  beforeData: FirebaseFirestore.DocumentData | undefined,
  afterData: FirebaseFirestore.DocumentData | undefined,
): string | null {
  const directBusinessId = nonEmptyString(afterData?.business_id) ?? nonEmptyString(beforeData?.business_id);
  if (directBusinessId) return directBusinessId;
  if (healthId.startsWith("snapshot_")) return healthId.slice("snapshot_".length);
  if (healthId.startsWith("booking_funnel_")) return healthId.slice("booking_funnel_".length);
  return null;
}

export async function syncObservabilityAlertsForBusiness(
  db: Firestore,
  businessId: string,
  source = "manual",
  now: Date = new Date(),
) {
  const sources = await loadObservabilitySources(db, businessId);
  const currentAlerts = buildActiveOpsAlerts(
    sources.snapshotInfo,
    sources.snapshotHealth,
    sources.bookingFunnelHealth,
    now,
  );
  const existingSnapshot = await db.collection("ops_alerts").where("business_id", "==", businessId).get();
  const plan = buildOpsAlertSyncPlan(
    existingSnapshot.docs.map((doc) => ({
      ...(doc.data() as Omit<ExistingOpsAlert, "id">),
      id: doc.id,
    })),
    currentAlerts,
    businessId,
    now.toISOString(),
    source,
  );

  if (plan.upserts.length === 0 && plan.resolves.length === 0) {
    return {
      active_alerts: 0,
      resolved_alerts: 0,
      evaluated_at: now.toISOString(),
    };
  }

  const batch = db.batch();
  for (const write of plan.upserts) {
    batch.set(db.collection("ops_alerts").doc(write.id), write.data, { merge: true });
  }
  for (const write of plan.resolves) {
    batch.set(db.collection("ops_alerts").doc(write.id), write.data, { merge: true });
  }
  await batch.commit();

  return {
    active_alerts: plan.upserts.length,
    resolved_alerts: plan.resolves.length,
    evaluated_at: now.toISOString(),
  };
}

export const syncObservabilityAlerts = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<{ business_id?: string }>) => {
    const db = getFirestore();
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const businessId = nonEmptyString(request.data?.business_id);
    if (!businessId) {
      throw new HttpsError("invalid-argument", "business_id is required");
    }

    await ensureOwnerOrAdmin(db, businessId, request.auth.uid);
    const result = await syncObservabilityAlertsForBusiness(db, businessId, "callable");
    return {
      success: true,
      ...result,
    };
  },
);

export const onPublicSnapshotAlertSync = onDocumentWritten(
  { region: "europe-west1", document: "public_snapshots/{businessId}" },
  async (event) => {
    const businessId = nonEmptyString(event.params.businessId);
    if (!businessId) return;

    try {
      await syncObservabilityAlertsForBusiness(getFirestore(), businessId, "public_snapshot_trigger");
    } catch (error) {
      console.error("Observability alert sync failed for public snapshot", businessId, error);
    }
  },
);

export const onOpsHealthAlertSync = onDocumentWritten(
  { region: "europe-west1", document: "ops_health/{healthId}" },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const kind = nonEmptyString(afterData?.kind) ?? nonEmptyString(beforeData?.kind);
    if (kind !== "public_snapshot" && kind !== "booking_funnel") {
      return;
    }

    const businessId = resolveHealthBusinessId(event.params.healthId, beforeData, afterData);
    if (!businessId) return;

    try {
      await syncObservabilityAlertsForBusiness(getFirestore(), businessId, `ops_health:${event.params.healthId}`);
    } catch (error) {
      console.error("Observability alert sync failed for ops_health", businessId, error);
    }
  },
);

export const refreshObservabilityAlerts = onSchedule(
  { region: "europe-west1", schedule: "every 1 hours", timeZone: "Europe/Bratislava" },
  async () => {
    const db = getFirestore();
    const businessesSnapshot = await db.collection("businesses").select().get();
    let synced = 0;
    let failed = 0;

    for (const businessDoc of businessesSnapshot.docs) {
      try {
        await syncObservabilityAlertsForBusiness(db, businessDoc.id, "scheduler");
        synced += 1;
      } catch (error) {
        failed += 1;
        console.error("Scheduled observability alert sync failed", businessDoc.id, error);
      }
    }

    console.log("Scheduled observability alert sync finished", {
      total_businesses: businessesSnapshot.size,
      synced,
      failed,
    });
  },
);
