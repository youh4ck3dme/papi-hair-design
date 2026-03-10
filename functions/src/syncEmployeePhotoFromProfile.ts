import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

function normalizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const onProfileWriteSyncEmployeePhoto = onDocumentWritten(
  { region: "europe-west1", document: "profiles/{profileId}" },
  async (event) => {
    const profileId = event.params.profileId as string;
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    // Only sync while profile exists.
    if (!after) return;

    const beforeAvatar = normalizeAvatarUrl(before?.avatar_url);
    const afterAvatar = normalizeAvatarUrl(after.avatar_url);
    if (beforeAvatar === afterAvatar) return;

    const db = getFirestore();
    const membershipsSnap = await db
      .collection("memberships")
      .where("profile_id", "==", profileId)
      .get();

    if (membershipsSnap.empty) return;

    const businessIds = new Set<string>();
    membershipsSnap.forEach((membershipDoc) => {
      const businessId = membershipDoc.data().business_id;
      if (typeof businessId === "string" && businessId.trim().length > 0) {
        businessIds.add(businessId);
      }
    });

    if (businessIds.size === 0) return;

    const nowIso = new Date().toISOString();
    for (const businessId of businessIds) {
      const employeesSnap = await db
        .collection("employees")
        .where("business_id", "==", businessId)
        .where("profile_id", "==", profileId)
        .get();

      if (employeesSnap.empty) continue;

      const batch = db.batch();
      employeesSnap.docs.forEach((employeeDoc) => {
        batch.update(employeeDoc.ref, {
          photo_url: afterAvatar,
          updated_at: nowIso,
        });
      });
      await batch.commit();
    }
  }
);

