import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";

interface OfflineAction {
    type: "APPOINTMENT_CREATE" | "APPOINTMENT_UPDATE" | "APPOINTMENT_CANCEL";
    payload: Record<string, unknown>;
    idempotency_key?: string;
    created_at?: string;
}

interface ConflictItem {
    idempotency_key: string;
    reason: string;
    server_suggestion?: { start_at: string; end_at: string };
}

// Accepts the client's push/pull shape:
//   Push: { actions: OfflineAction[] }
//   Pull: { days?: number, last_sync_timestamp?: string, business_id?: string }
interface SyncData {
    actions?: OfflineAction[];
    business_id?: string;
    days?: number;
    last_sync_timestamp?: string;
}

export const syncOfflineData = functions.https.onCall(async (request: CallableRequest<SyncData>) => {
    const { auth, data } = request;
    const db = admin.firestore();

    if (!auth) {
        throw new HttpsError("unauthenticated", "Neautorizovaný prístup");
    }

    const { actions, business_id, days, last_sync_timestamp } = data;
    const conflicts: ConflictItem[] = [];
    let applied = 0;

    // --- Push phase: process queued offline actions ---
    if (actions && Array.isArray(actions) && actions.length > 0) {
        const batch = db.batch();
        for (const action of actions) {
            const { type, payload, idempotency_key } = action;
            if (!type || !payload) continue;

            try {
                if (type === "APPOINTMENT_CREATE") {
                    const id = payload.id as string;
                    if (!id) continue;
                    const docRef = db.collection("appointments").doc(id);
                    batch.set(docRef, { ...payload, updated_at: new Date().toISOString() }, { merge: true });
                    applied++;
                } else if (type === "APPOINTMENT_UPDATE") {
                    const id = payload.id as string;
                    if (!id) continue;
                    const docRef = db.collection("appointments").doc(id);
                    batch.set(docRef, { ...payload, updated_at: new Date().toISOString() }, { merge: true });
                    applied++;
                } else if (type === "APPOINTMENT_CANCEL") {
                    const id = payload.id as string;
                    if (!id) continue;
                    const docRef = db.collection("appointments").doc(id);
                    batch.update(docRef, {
                        status: "cancelled",
                        cancel_reason: payload.reason ?? null,
                        updated_at: new Date().toISOString()
                    });
                    applied++;
                }
            } catch {
                if (idempotency_key) {
                    conflicts.push({ idempotency_key, reason: "write_failed" });
                }
            }
        }
        await batch.commit();
    }

    // --- Pull phase: fetch appointments updated since last sync ---
    const appointments: Record<string, unknown>[] = [];

    if (business_id) {
        // Verify access to this specific business before pulling
        const membershipSnap = await db.collection("memberships")
            .where("business_id", "==", business_id)
            .where("profile_id", "==", auth.uid)
            .limit(1)
            .get();

        if (membershipSnap.empty) {
            throw new HttpsError("permission-denied", "Access denied");
        }

        let pullQuery = db.collection("appointments").where("business_id", "==", business_id);
        const MS_PER_DAY = 86_400_000;
        const since = last_sync_timestamp ?? (days ? new Date(Date.now() - days * MS_PER_DAY).toISOString() : null);
        if (since) {
            pullQuery = pullQuery.where("updated_at", ">", since);
        }
        const snap = await pullQuery.get();
        snap.forEach(d => appointments.push({ id: d.id, ...d.data() }));
    }

    return {
        success: true,
        applied,
        conflicts,
        appointments,
        server_timestamp: new Date().toISOString(),
    };
});
