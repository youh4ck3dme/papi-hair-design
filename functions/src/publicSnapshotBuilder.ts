import { getFirestore, Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export interface PublicSnapshot {
  business: Record<string, unknown>;
  services: Record<string, unknown>[];
  service_subcategories: Record<string, unknown>[];
  employees: Record<string, unknown>[];
  business_hours: Record<string, unknown>[];
  date_overrides: Record<string, unknown>[];
  employee_service_map: Record<string, string[]>;
  revision: number;
  updated_at: string;
  status: "ready";
}

export interface SnapshotBuildContext {
  source?: string;
  trigger_document?: string | null;
  trigger_event_id?: string | null;
  trigger_auth_type?: string | null;
  trigger_auth_id?: string | null;
}

function buildSnapshotMetrics(snapshot: PublicSnapshot) {
  return {
    service_count: snapshot.services.length,
    subcategory_count: snapshot.service_subcategories.length,
    employee_count: snapshot.employees.length,
    business_hours_count: snapshot.business_hours.length,
    date_override_count: snapshot.date_overrides.length,
    employee_service_employee_count: Object.keys(snapshot.employee_service_map).length,
    employee_service_link_count: Object.values(snapshot.employee_service_map).reduce(
      (total, serviceIds) => total + serviceIds.length,
      0,
    ),
  };
}

export async function writeSnapshotFailure(
  db: Firestore,
  businessId: string,
  error: unknown,
  context: SnapshotBuildContext = {},
) {
  const updatedAt = new Date().toISOString();
  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown error";

  const payload = {
    kind: "public_snapshot",
    business_id: businessId,
    status: "failed",
    updated_at: updatedAt,
    last_failure_at: updatedAt,
    error: errorMessage,
    last_trigger_source: context.source ?? "unknown",
    last_trigger_document: context.trigger_document ?? null,
    last_trigger_event_id: context.trigger_event_id ?? null,
    last_trigger_auth_type: context.trigger_auth_type ?? null,
    last_trigger_auth_id: context.trigger_auth_id ?? null,
  };

  await Promise.all([
    db.collection("ops_health").doc(`snapshot_${businessId}`).set(payload, { merge: true }),
    db.collection("snapshot_rebuild_events").add({
      ...payload,
      created_at: updatedAt,
      revision: null,
    }),
  ]);
}

export async function buildAndWriteSnapshot(
  db: Firestore,
  businessId: string,
  context: SnapshotBuildContext = {},
) {
  const startedAt = Date.now();
  const [bizDoc, servicesSnap, serviceSubcategoriesSnap, employeesSnap, hoursSnap, overridesSnap, esSnap] =
    await Promise.all([
      db.collection("businesses").doc(businessId).get(),
      db
        .collection("services")
        .where("business_id", "==", businessId)
        .where("is_active", "==", true)
        .get(),
      db
        .collection("service_subcategories")
        .where("business_id", "==", businessId)
        .where("is_active", "==", true)
        .get(),
      db
        .collection("employees")
        .where("business_id", "==", businessId)
        .where("is_active", "==", true)
        .get(),
      db
        .collection("business_hours")
        .where("business_id", "==", businessId)
        .get(),
      db
        .collection("business_date_overrides")
        .where("business_id", "==", businessId)
        .get(),
      db.collection("employee_services").get(),
    ]);

  if (!bizDoc.exists) {
    throw new HttpsError("not-found", "Business not found");
  }

  const employeeIds = new Set(employeesSnap.docs.map((d) => d.id));
  const employeeServiceMap: Record<string, string[]> = {};
  esSnap.forEach((d) => {
    const ed = d.data() as { employee_id?: string; service_id?: string };
    if (ed.employee_id && employeeIds.has(ed.employee_id) && ed.service_id) {
      if (!employeeServiceMap[ed.employee_id]) employeeServiceMap[ed.employee_id] = [];
      employeeServiceMap[ed.employee_id].push(ed.service_id);
    }
  });

  const snapshot: PublicSnapshot = {
    business: { id: bizDoc.id, ...bizDoc.data() },
    services: servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    service_subcategories: serviceSubcategoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    employees: employeesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    business_hours: hoursSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    date_overrides: overridesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    employee_service_map: employeeServiceMap,
    revision: Date.now(),
    updated_at: new Date().toISOString(),
    status: "ready",
  };

  const metrics = buildSnapshotMetrics(snapshot);
  const durationMs = Date.now() - startedAt;
  const healthPayload = {
    kind: "public_snapshot",
    business_id: businessId,
    status: "ready",
    revision: snapshot.revision,
    updated_at: snapshot.updated_at,
    last_success_at: snapshot.updated_at,
    error: null,
    duration_ms: durationMs,
    last_trigger_source: context.source ?? "unknown",
    last_trigger_document: context.trigger_document ?? null,
    last_trigger_event_id: context.trigger_event_id ?? null,
    last_trigger_auth_type: context.trigger_auth_type ?? null,
    last_trigger_auth_id: context.trigger_auth_id ?? null,
    ...metrics,
  };

  await db.collection("public_snapshots").doc(businessId).set(snapshot);
  await Promise.all([
    db.collection("ops_health").doc(`snapshot_${businessId}`).set(healthPayload, { merge: true }),
    db.collection("snapshot_rebuild_events").add({
      ...healthPayload,
      created_at: snapshot.updated_at,
    }),
  ]);
  return snapshot.revision;
}

export async function rebuildSnapshotForBusiness(businessId: string) {
  const db = getFirestore();
  return buildAndWriteSnapshot(db, businessId);
}
