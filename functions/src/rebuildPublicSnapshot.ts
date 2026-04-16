import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWrittenWithAuthContext } from "firebase-functions/v2/firestore";
import { buildAndWriteSnapshot, writeSnapshotFailure, type SnapshotBuildContext } from "./publicSnapshotBuilder.js";

interface RebuildSnapshotInput {
  business_id: string;
}

function resolveBusinessId(
  before: FirebaseFirestore.DocumentSnapshot | undefined,
  after: FirebaseFirestore.DocumentSnapshot | undefined,
  paramId?: string
) {
  if (paramId) return paramId;
  const fromAfter = after?.data()?.business_id as string | undefined;
  if (fromAfter) return fromAfter;
  const fromBefore = before?.data()?.business_id as string | undefined;
  return fromBefore;
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

    const revision = await buildAndWriteSnapshot(db, businessId);
    return { success: true, revision };
  }
);

async function rebuildFromChange(
  before: FirebaseFirestore.DocumentSnapshot | undefined,
  after: FirebaseFirestore.DocumentSnapshot | undefined,
  context: SnapshotBuildContext = {},
  businessIdParam?: string,
) {
  const db = getFirestore();
  const businessId = resolveBusinessId(before, after, businessIdParam);
  if (!businessId) return;
  try {
    await buildAndWriteSnapshot(db, businessId, context);
  } catch (err: any) {
    await writeSnapshotFailure(db, businessId, err, context);
    console.error("Snapshot rebuild failed", businessId, err);
  }
}

export const onBusinessWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "businesses/{businessId}" },
  async (event) =>
    rebuildFromChange(
      event.data?.before,
      event.data?.after,
      {
        source: "businesses",
        trigger_document: event.document,
        trigger_event_id: event.id,
        trigger_auth_type: event.authType,
        trigger_auth_id: event.authId ?? null,
      },
      event.params.businessId,
    ),
);

export const onServiceWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "services/{serviceId}" },
  async (event) =>
    rebuildFromChange(event.data?.before, event.data?.after, {
      source: "services",
      trigger_document: event.document,
      trigger_event_id: event.id,
      trigger_auth_type: event.authType,
      trigger_auth_id: event.authId ?? null,
    }),
);

export const onServiceSubcategoryWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "service_subcategories/{subcategoryId}" },
  async (event) =>
    rebuildFromChange(event.data?.before, event.data?.after, {
      source: "service_subcategories",
      trigger_document: event.document,
      trigger_event_id: event.id,
      trigger_auth_type: event.authType,
      trigger_auth_id: event.authId ?? null,
    }),
);

export const onEmployeeWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "employees/{employeeId}" },
  async (event) =>
    rebuildFromChange(event.data?.before, event.data?.after, {
      source: "employees",
      trigger_document: event.document,
      trigger_event_id: event.id,
      trigger_auth_type: event.authType,
      trigger_auth_id: event.authId ?? null,
    }),
);

export const onBusinessHoursWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "business_hours/{docId}" },
  async (event) =>
    rebuildFromChange(event.data?.before, event.data?.after, {
      source: "business_hours",
      trigger_document: event.document,
      trigger_event_id: event.id,
      trigger_auth_type: event.authType,
      trigger_auth_id: event.authId ?? null,
    }),
);

export const onDateOverrideWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "business_date_overrides/{docId}" },
  async (event) =>
    rebuildFromChange(event.data?.before, event.data?.after, {
      source: "business_date_overrides",
      trigger_document: event.document,
      trigger_event_id: event.id,
      trigger_auth_type: event.authType,
      trigger_auth_id: event.authId ?? null,
    }),
);

export const onEmployeeServiceWrite = onDocumentWrittenWithAuthContext(
  { region: "europe-west1", document: "employee_services/{docId}" },
  async (event) =>
    rebuildFromChange(event.data?.before, event.data?.after, {
      source: "employee_services",
      trigger_document: event.document,
      trigger_event_id: event.id,
      trigger_auth_type: event.authType,
      trigger_auth_id: event.authId ?? null,
    }),
);
