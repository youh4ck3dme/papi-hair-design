import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import { requireAuth, requireMembership } from "./guards";

interface SyncChange {
    table: "appointments";
    id: string;
    data?: Record<string, unknown>;
    deleted?: boolean;
}

interface LegacyOfflineActionCreate {
    type: "APPOINTMENT_CREATE";
    payload: Record<string, unknown> & { id?: string };
}

interface LegacyOfflineActionUpdate {
    type: "APPOINTMENT_UPDATE";
    payload: Record<string, unknown> & { id?: string };
}

interface LegacyOfflineActionCancel {
    type: "APPOINTMENT_CANCEL";
    payload: { id?: string; reason?: string };
}

type LegacyOfflineAction =
    | LegacyOfflineActionCreate
    | LegacyOfflineActionUpdate
    | LegacyOfflineActionCancel;

interface SyncData {
    business_id?: string;
    last_sync_timestamp?: string;
    changes?: SyncChange[];
    actions?: LegacyOfflineAction[];
    days?: number;
}

const MAX_SYNC_CHANGES = 100;
const MAX_ID_LENGTH = 128;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const APPOINTMENT_MUTABLE_FIELDS = new Set([
    "start_at",
    "end_at",
    "customer_name",
    "customer_phone",
    "customer_email",
    "customer_id",
    "employee_id",
    "employee_name",
    "employee_color",
    "service_id",
    "service_name",
    "service_price",
    "status",
    "note",
    "updated_at"
]);

function assertSafeId(value: string): void {
    if (!value || value.length > MAX_ID_LENGTH || !SAFE_ID.test(value)) {
        throw new HttpsError("invalid-argument", "Invalid document id");
    }
}

function normalizeLegacyActions(actions: LegacyOfflineAction[] | undefined, businessId: string): SyncChange[] {
    if (!actions?.length) return [];

    const nowIso = new Date().toISOString();
    const changes: SyncChange[] = [];

    for (const action of actions) {
        const actionId = action.payload?.id;
        if (typeof actionId !== "string" || !actionId) continue;

        if (action.type === "APPOINTMENT_CANCEL") {
            changes.push({
                table: "appointments",
                id: actionId,
                data: { status: "cancelled", updated_at: nowIso, business_id: businessId },
                deleted: false
            });
            continue;
        }

        const payloadData = { ...action.payload, business_id: businessId };
        changes.push({
            table: "appointments",
            id: actionId,
            data: payloadData,
            deleted: false
        });
    }

    return changes;
}

function normalizeChanges(data: SyncData, businessId: string): SyncChange[] {
    const directChanges = Array.isArray(data.changes) ? data.changes : [];
    const legacyChanges = normalizeLegacyActions(data.actions, businessId);
    const merged = [...directChanges, ...legacyChanges];

    if (!merged.length) return [];
    if (merged.length > MAX_SYNC_CHANGES) {
        throw new HttpsError("invalid-argument", "Too many changes in a single sync");
    }
    return merged;
}

function buildAppointmentPatch(raw: Record<string, unknown> | undefined, businessId: string): Record<string, unknown> {
    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
        business_id: businessId,
        updated_at: nowIso
    };

    if (!raw) {
        return patch;
    }

    for (const [key, value] of Object.entries(raw)) {
        if (!APPOINTMENT_MUTABLE_FIELDS.has(key)) continue;
        if (value === undefined) continue;
        patch[key] = value;
    }

    // Legacy payload compatibility from local queue
    if (typeof raw.price_total === "number" && patch.service_price === undefined) {
        patch.service_price = raw.price_total;
    }

    return patch;
}

async function resolveBusinessId(db: FirebaseFirestore.Firestore, uid: string, requestedBusinessId?: string): Promise<string> {
    if (requestedBusinessId) {
        await requireMembership(uid, requestedBusinessId, ["owner", "admin", "employee"]);
        return requestedBusinessId;
    }

    const fallbackMembership = await db.collection("memberships")
        .where("profile_id", "==", uid)
        .limit(1)
        .get();

    if (fallbackMembership.empty) {
        throw new HttpsError("permission-denied", "Access denied");
    }

    const businessId = fallbackMembership.docs[0].data().business_id;
    if (typeof businessId !== "string" || !businessId) {
        throw new HttpsError("failed-precondition", "Membership has no business_id");
    }

    return businessId;
}

export const syncOfflineData = functions.https.onCall({ region: "europe-west1" }, async (request: CallableRequest<SyncData>) => {
    const { auth, data } = request;
    const db = getFirestore();

    const uid = requireAuth(auth);

    const businessId = await resolveBusinessId(db, uid, data.business_id);
    const incomingChanges = normalizeChanges(data, businessId);
    const lastSyncTimestamp = typeof data.last_sync_timestamp === "string" ? data.last_sync_timestamp : undefined;
    const nowIso = new Date().toISOString();

    let applied = 0;

    if (incomingChanges.length > 0) {
        const batch = db.batch();

        for (const change of incomingChanges) {
            if (change.table !== "appointments") {
                throw new HttpsError("invalid-argument", "Unsupported table in sync payload");
            }

            assertSafeId(change.id);

            const docRef = db.collection("appointments").doc(change.id);
            const existingDoc = await docRef.get();

            if (existingDoc.exists) {
                const existingBusinessId = existingDoc.data()?.business_id;
                if (existingBusinessId !== businessId) {
                    throw new HttpsError("permission-denied", "Cross-business sync mutation denied");
                }
            }

            if (change.deleted) {
                if (existingDoc.exists) {
                    batch.delete(docRef);
                    applied += 1;
                }
                continue;
            }

            const patch = buildAppointmentPatch(change.data, businessId);
            batch.set(docRef, patch, { merge: true });
            applied += 1;
        }

        if (applied > 0) {
            await batch.commit();
        }
    }

    let pullQuery = db.collection("appointments").where("business_id", "==", businessId);
    if (lastSyncTimestamp) {
        pullQuery = pullQuery.where("updated_at", ">", lastSyncTimestamp);
    } else if (typeof data.days === "number" && Number.isFinite(data.days) && data.days > 0) {
        const sinceDate = new Date(Date.now() - Math.floor(data.days) * 24 * 60 * 60 * 1000).toISOString();
        pullQuery = pullQuery.where("updated_at", ">", sinceDate);
    }

    const appointmentsSnap = await pullQuery.get();
    const pulledAppointments = appointmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
        success: true,
        applied,
        server_timestamp: nowIso,
        appointments: pulledAppointments,
        conflicts: [] as Array<{ idempotency_key: string; reason: string; server_suggestion?: { start_at: string; end_at: string } }>,
        pulled: {
            appointments: pulledAppointments
        }
    };
});
