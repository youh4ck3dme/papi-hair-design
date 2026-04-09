import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";

const BATCH_LIMIT = 200;

export const cleanupExpiredHolds = onSchedule("every 15 minutes", async () => {
    const db = getFirestore();
    const nowIso = new Date().toISOString();

    const snap = await db
      .collection("appointments")
      .where("status", "==", "hold_created")
      .where("hold_expires_at", "<", nowIso)
      .limit(BATCH_LIMIT)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "expired",
        expired_at: new Date().toISOString(),
      });
    });

    await batch.commit();
  });
