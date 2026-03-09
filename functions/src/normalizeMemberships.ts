import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { type CallableRequest } from "firebase-functions/v2/https";
import { requireAuth, type MembershipRole } from "./guards";

interface NormalizeMembershipsData {
  business_id?: string;
}

const ROLE_PRIORITY: MembershipRole[] = ["owner", "admin", "employee", "customer"];

function normalizeRole(value: unknown): MembershipRole {
  if (value === "owner" || value === "admin" || value === "employee" || value === "customer") {
    return value;
  }
  return "customer";
}

function roleRank(role: MembershipRole): number {
  return ROLE_PRIORITY.indexOf(role);
}

export const normalizeMemberships = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<NormalizeMembershipsData>) => {
    const uid = requireAuth(request.auth);
    const db = getFirestore();
    const requestedBusinessId = request.data?.business_id?.trim();

    let q = db.collection("memberships").where("profile_id", "==", uid);
    if (requestedBusinessId) {
      q = q.where("business_id", "==", requestedBusinessId);
    }

    const snap = await q.get();
    if (snap.empty) {
      return { success: true, normalized: 0 };
    }

    const strongestByBusiness = new Map<string, { role: MembershipRole; created_at?: unknown }>();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as { business_id?: unknown; role?: unknown; created_at?: unknown };
      if (typeof data.business_id !== "string" || !data.business_id.trim()) continue;
      const businessId = data.business_id.trim();
      const role = normalizeRole(data.role);
      const current = strongestByBusiness.get(businessId);

      if (!current || roleRank(role) < roleRank(current.role)) {
        strongestByBusiness.set(businessId, { role, created_at: data.created_at });
      }
    }

    if (!strongestByBusiness.size) {
      return { success: true, normalized: 0 };
    }

    const batch = db.batch();
    let normalized = 0;
    const now = new Date().toISOString();

    for (const [businessId, value] of strongestByBusiness.entries()) {
      const canonicalId = `${uid}_${businessId}`;
      const canonicalRef = db.collection("memberships").doc(canonicalId);
      batch.set(
        canonicalRef,
        {
          business_id: businessId,
          profile_id: uid,
          role: value.role,
          created_at: value.created_at ?? now,
          updated_at: now,
        },
        { merge: true }
      );
      normalized += 1;
    }

    await batch.commit();
    return { success: true, normalized };
  }
);

