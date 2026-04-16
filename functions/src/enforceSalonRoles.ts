import * as functions from "firebase-functions/v2";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { requireAuth, requireMembership } from "./guards";
import { buildAndWriteSnapshot } from "./publicSnapshotBuilder";

interface EnforceSalonRolesData {
  business_id?: string;
}

const DEFAULT_BUSINESS_ID = "papi-hair-design-main";
const OWNER_EMAIL = "papi@papihairdesign.sk";
const EMPLOYEE_EMAILS = ["mato@papihairdesign.sk", "miska@papihairdesign.sk"] as const;

async function findAuthUidByEmail(email: string): Promise<string | null> {
  try {
    const userRecord = await getAuth().getUserByEmail(email);
    return userRecord.uid;
  } catch (error) {
    logger.warn("enforceSalonRoles: auth user not found by email", { email, error });
    return null;
  }
}

export const enforceSalonRoles = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<EnforceSalonRolesData>) => {
    const uid = requireAuth(request.auth);
    const businessId = request.data?.business_id?.trim() || DEFAULT_BUSINESS_ID;
    await requireMembership(uid, businessId, ["owner"]);

    const db = getFirestore();
    const now = new Date().toISOString();

    const ownerProfileId = await findAuthUidByEmail(OWNER_EMAIL);
    if (!ownerProfileId) {
      throw new HttpsError("failed-precondition", `Owner auth user for ${OWNER_EMAIL} not found.`);
    }

    const targetProfiles: Array<{ profileId: string; role: "owner" | "employee" }> = [
      { profileId: ownerProfileId, role: "owner" },
    ];

    for (const employeeEmail of EMPLOYEE_EMAILS) {
      const profileId = await findAuthUidByEmail(employeeEmail);
      if (profileId) {
        targetProfiles.push({ profileId, role: "employee" });
      }
    }

    let updated = 0;
    for (const target of targetProfiles) {
      const membershipId = `${target.profileId}_${businessId}`;
      const ref = db.collection("memberships").doc(membershipId);
      const snap = await ref.get();

      const currentRole = typeof snap.data()?.role === "string" ? snap.data()?.role : "";
      if (currentRole === target.role) {
        continue;
      }

      await ref.set(
        {
          business_id: businessId,
          profile_id: target.profileId,
          role: target.role,
          created_at: snap.exists ? snap.data()?.created_at ?? now : now,
          updated_at: now,
        },
        { merge: true }
      );
      updated += 1;
    }

    await buildAndWriteSnapshot(db, businessId);

    return {
      success: true,
      business_id: businessId,
      updated,
      enforced_profiles: targetProfiles.map((target) => target.profileId),
    };
  }
);
