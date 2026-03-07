import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";

interface SyncData {
    business_id: string;
    last_sync_timestamp?: string;
    changes?: any[];
}

export const syncOfflineData = functions.https.onCall(async (request: CallableRequest<SyncData>) => {
    const { auth, data } = request;
    const db = admin.firestore();

    if (!auth) {
        throw new HttpsError("unauthenticated", "Neautorizovaný prístup");
    }

    const { business_id, last_sync_timestamp, changes } = data;

    if (!business_id) {
        throw new HttpsError("invalid-argument", "Missing business_id");
    }

    // Verify access
    const membershipSnap = await db.collection("memberships")
        .where("business_id", "==", business_id)
        .where("profile_id", "==", auth.uid)
        .limit(1)
        .get();

    if (membershipSnap.empty) {
        throw new HttpsError("permission-denied", "Access denied");
    }

    // Replicating basic sync logic:
    // 1. Process incoming changes (upserts)
    if (changes && Array.isArray(changes) && changes.length > 0) {
        const batch = db.batch();
        for (const change of changes) {
            const { table, id, data: rowData, deleted } = change;
            if (!table || !id) continue;

            const docRef = db.collection(table).doc(id);
            if (deleted) {
                batch.delete(docRef);
            } else {
                batch.set(docRef, { ...rowData, updated_at: new Date().toISOString() }, { merge: true });
            }
        }
        await batch.commit();
    }

    // 2. Fetch changes since last sync
    let pullQuery = db.collection("appointments").where("business_id", "==", business_id);
    if (last_sync_timestamp) {
        pullQuery = pullQuery.where("updated_at", ">", last_sync_timestamp);
    }

    const appointmentsSnap = await pullQuery.get();
    const pulledAppointments = appointmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
        success: true,
        server_timestamp: new Date().toISOString(),
        pulled: {
            appointments: pulledAppointments
        }
    };
});
