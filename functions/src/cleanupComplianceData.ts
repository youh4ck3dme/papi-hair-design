import { getFirestore, type Query, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  buildRetentionCutoff,
  COMPLIANCE_RETENTION_POLICIES,
  type ComplianceRetentionPolicy,
} from "./complianceRetention";

const QUERY_BATCH_LIMIT = 200;
const MAX_QUERY_ROUNDS = 25;

async function deleteQueryInBatches(queryFactory: () => Query): Promise<number> {
  const db = getFirestore();
  let deleted = 0;

  for (let round = 0; round < MAX_QUERY_ROUNDS; round += 1) {
    const snap = await queryFactory().limit(QUERY_BATCH_LIMIT).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));
    await batch.commit();

    deleted += snap.size;
    if (snap.size < QUERY_BATCH_LIMIT) break;
  }

  return deleted;
}

function createRetentionQuery(policy: ComplianceRetentionPolicy, now: Date): () => Query {
  const db = getFirestore();
  const cutoff = buildRetentionCutoff(policy, now);
  const scope =
    policy.kind === "collection"
      ? db.collection(policy.collectionName)
      : db.collectionGroup(policy.collectionName);

  return () => scope.where(policy.field, "<", cutoff);
}

export const cleanupComplianceData = onSchedule(
  { schedule: "every 24 hours", region: "europe-west1", timeZone: "Europe/Bratislava" },
  async () => {
    const now = new Date();
    const deletedByPolicy: Record<string, number> = {};

    for (const policy of COMPLIANCE_RETENTION_POLICIES) {
      const deleted = await deleteQueryInBatches(createRetentionQuery(policy, now));
      deletedByPolicy[policy.key] = deleted;
    }

    console.info("Compliance retention cleanup completed", {
      ran_at: now.toISOString(),
      deleted_by_policy: deletedByPolicy,
    });
  },
);
