import * as functions from  firebase-functions/v2;
import { getFirestore } from firebase-admin/firestore;

const BATCH_LIMIT = 200;

export const cleanupExpiredHolds = functions.pubsub.schedule(every 15 minutes).onRun(async () => {
  const db = getFirestore();
  const nowIso = new Date().toISOString();

  const snap = await db
    .collection(appointments)
    .where(status, ==, hold_created)
    .where(hold_expires_at, <, nowIso)
    .limit(BATCH_LIMIT)
    .get();

  if (snap.empty) return null;

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: expired,
      expired_at: new Date().toISOString(),
    });
  });

  await batch.commit();
  return { expired: snap.size };
});
