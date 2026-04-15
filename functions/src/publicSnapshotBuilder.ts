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

export async function buildAndWriteSnapshot(db: Firestore, businessId: string) {
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

  await db.collection("public_snapshots").doc(businessId).set(snapshot);
  await db.collection("ops_health").doc(`snapshot_${businessId}`).set({
    kind: "public_snapshot",
    business_id: businessId,
    status: "ready",
    revision: snapshot.revision,
    updated_at: snapshot.updated_at,
    error: null,
  });
  return snapshot.revision;
}

export async function rebuildSnapshotForBusiness(businessId: string) {
  const db = getFirestore();
  return buildAndWriteSnapshot(db, businessId);
}
