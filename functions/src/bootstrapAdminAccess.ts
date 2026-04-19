import * as functions from "firebase-functions/v2";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "./guards";
import { buildAndWriteSnapshot } from "./publicSnapshotBuilder";

interface BootstrapAdminAccessData {
  business_id?: string;
}

const DEFAULT_BUSINESS_ID = "papi-hair-design-main";
type BootstrapRole = "owner" | "admin";
const BOOTSTRAP_OWNER_EMAILS = new Set([
  "papi@papihairdesign.sk",
]);

function buildDisplayName(email: string | null | undefined) {
  if (!email) return "Papi Hair Design";
  const name = email.split("@")[0]?.trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Papi Hair Design";
}

export function resolveBootstrapRole(
  uid: string,
  ownerProfileIds: string[],
  emailAllowedForBootstrap: boolean
): BootstrapRole | null {
  if (!emailAllowedForBootstrap) {
    return null;
  }

  if (ownerProfileIds.length === 0 || ownerProfileIds.includes(uid)) {
    return "owner";
  }

  return "admin";
}

export const bootstrapAdminAccess = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<BootstrapAdminAccessData>) => {
    const uid = requireAuth(request.auth);
    const email = request.auth?.token.email;
    const businessId = request.data?.business_id?.trim() || DEFAULT_BUSINESS_ID;
    const db = getFirestore();

    const now = new Date().toISOString();
    const emailAllowedForBootstrap = !!email && BOOTSTRAP_OWNER_EMAILS.has(email);
    const membershipRef = db.collection("memberships").doc(`${uid}_${businessId}`);
    const membershipSnap = await membershipRef.get();

    if (membershipSnap.exists) {
      const existingRole = membershipSnap.data()?.role ?? null;
      if (existingRole === "owner" || existingRole === "admin") {
        await buildAndWriteSnapshot(db, businessId);
        return { success: true, role: existingRole, business_id: businessId, already_bootstrapped: true };
      }
      if (!emailAllowedForBootstrap) {
        throw new HttpsError("permission-denied", "Existing membership is not eligible for admin bootstrap");
      }
    }

    const ownerSnap = await db
      .collection("memberships")
      .where("business_id", "==", businessId)
      .where("role", "==", "owner")
      .get();

    const ownerProfileIds = ownerSnap.docs
      .map((ownerDoc) => ownerDoc.data().profile_id)
      .filter((profileId): profileId is string => typeof profileId === "string" && profileId.length > 0);
    const targetRole = resolveBootstrapRole(uid, ownerProfileIds, emailAllowedForBootstrap);
    if (!targetRole) {
      throw new HttpsError("permission-denied", "Email is not allowed for bootstrap");
    }

    const businessRef = db.collection("businesses").doc(businessId);
    const profileRef = db.collection("profiles").doc(uid);
    const employeesSnap = await db
      .collection("employees")
      .where("business_id", "==", businessId)
      .where("profile_id", "==", uid)
      .limit(1)
      .get();

    const batch = db.batch();
    batch.set(
      businessRef,
      {
        name: "Papi Hair Design",
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    batch.set(
      profileRef,
      {
        full_name: buildDisplayName(email),
        email: email ?? null,
        updated_at: now,
      },
      { merge: true }
    );
    batch.set(
      membershipRef,
      {
        business_id: businessId,
        profile_id: uid,
        role: targetRole,
        created_at: membershipSnap.exists ? membershipSnap.data()?.created_at ?? now : now,
        updated_at: now,
      },
      { merge: true }
    );

    if (employeesSnap.empty) {
      const employeeRef = db.collection("employees").doc();
      batch.set(employeeRef, {
        business_id: businessId,
        profile_id: uid,
        display_name: buildDisplayName(email),
        email: email ?? null,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    await batch.commit();
    const revision = await buildAndWriteSnapshot(db, businessId);

    return {
      success: true,
      role: targetRole,
      business_id: businessId,
      already_bootstrapped: false,
      revision,
    };
  }
);
