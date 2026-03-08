import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, CallableRequest } from "firebase-functions/v2/https";

interface RebuildSnapshotInput {
  business_id: string;
}

interface PublicSnapshot {
  business: Record<string, unknown>;
  services: Record<string, unknown>[];
  employees: Record<string, unknown>[];
  business_hours: Record<string, unknown>[];
  date_overrides: Record<string, unknown>[];
  employee_service_map: Record<string, string[]>;
  revision: number;
  updated_at: string;
  status: "ready";
}

export const rebuildPublicSnapshot = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<RebuildSnapshotInput>) => {
    const { auth, data } = request;
    const db = getFirestore();

    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const businessId = data.business_id?.trim();
    if (!businessId) {
      throw new HttpsError("invalid-argument", "business_id is required");
    }

    // Require owner/admin membership
    const membershipSnap = await db
      .collection("memberships")
      .where("business_id", "==", businessId)
      .where("profile_id", "==", auth.uid)
      .limit(1)
      .get();
    const role = membershipSnap.empty ? "" : ((membershipSnap.docs[0].data().role as string) || "");
    if (membershipSnap.empty || !(role === "owner" || role === "admin")) {
      throw new HttpsError("permission-denied", "Forbidden");
    }

    const [bizDoc, servicesSnap, employeesSnap, hoursSnap, overridesSnap, esSnap] =
      await Promise.all([
        db.collection("businesses").doc(businessId).get(),
        db
          .collection("services")
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

    const employeeServiceMap: Record<string, string[]> = {};
    esSnap.forEach((d) => {
      const ed = d.data() as any;
      if (ed.business_id === businessId && ed.employee_id && ed.service_id) {
        if (!employeeServiceMap[ed.employee_id]) employeeServiceMap[ed.employee_id] = [];
        employeeServiceMap[ed.employee_id].push(ed.service_id);
      }
    });

    const snapshot: PublicSnapshot = {
      business: { id: bizDoc.id, ...bizDoc.data() },
      services: servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      employees: employeesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      business_hours: hoursSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      date_overrides: overridesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      employee_service_map: employeeServiceMap,
      revision: Date.now(),
      updated_at: new Date().toISOString(),
      status: "ready",
    };

    await db.collection("public_snapshots").doc(businessId).set(snapshot);

    return { success: true, revision: snapshot.revision };
  }
);
