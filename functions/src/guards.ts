import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export type MembershipRole = "owner" | "admin" | "employee" | "customer";

export function requireAuth(auth: { uid?: string } | undefined) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  return auth.uid;
}

export async function requireMembership(
  uid: string,
  businessId: string,
  allowed: MembershipRole[] = ["owner", "admin", "employee"]
) {
  const db = getFirestore();
  const snap = await db
    .collection("memberships")
    .where("business_id", "==", businessId)
    .where("profile_id", "==", uid)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("permission-denied", "Membership required");
  }

  const membership = snap.docs[0].data() as { role?: MembershipRole; business_id: string; profile_id: string };
  if (!allowed.includes(membership.role ?? "customer")) {
    throw new HttpsError("permission-denied", "Insufficient role");
  }

  return membership;
}
