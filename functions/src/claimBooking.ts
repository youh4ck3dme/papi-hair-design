import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface ClaimBookingData {
    claim_token: string;
}

export const claimBooking = functions.https.onCall({ region: "europe-west1" }, async (request: CallableRequest<ClaimBookingData>) => {
    const { auth, data } = request;
    const db = getFirestore();

    if (!auth) {
        throw new HttpsError("unauthenticated", "Neautorizovaný prístup");
    }

    const { claim_token } = data;
    if (!claim_token) {
        throw new HttpsError("invalid-argument", "Chýba claim token");
    }

    const userId = auth.uid;

    // Hash the provided token
    const tokenHash = crypto.createHash("sha256").update(claim_token).digest("hex");

    // Find the claim
    const claimsSnap = await db.collection("booking_claims")
        .where("token_hash", "==", tokenHash)
        .where("used_at", "==", null)
        .limit(1)
        .get();

    if (claimsSnap.empty) {
        throw new HttpsError("not-found", "Neplatný alebo expirovaný token");
    }

    const claimDoc = claimsSnap.docs[0];
    const claim = claimDoc.data();

    // Check expiry
    if (new Date(claim.expires_at) < new Date()) {
        throw new HttpsError("failed-precondition", "Token expiroval");
    }

    // Link customer to user profile
    const customersSnap = await db.collection("customers")
        .where("business_id", "==", claim.business_id)
        .where("email", "==", claim.email)
        .get();

    const batch = db.batch();
    customersSnap.forEach(doc => {
        batch.update(doc.ref, { profile_id: userId });
    });

    // Mark claim as used
    batch.update(claimDoc.ref, { used_at: new Date().toISOString() });

    // Create customer membership if not exists
    const membershipsSnap = await db.collection("memberships")
        .where("business_id", "==", claim.business_id)
        .where("profile_id", "==", userId)
        .get();

    const canonicalMembershipId = `${userId}_${claim.business_id}`;
    const hasCanonicalMembership = membershipsSnap.docs.some((docSnap) => docSnap.id === canonicalMembershipId);
    if (!hasCanonicalMembership) {
        const memRef = db.collection("memberships").doc(canonicalMembershipId);
        batch.set(memRef, {
            business_id: claim.business_id,
            profile_id: userId,
            role: "customer",
            created_at: new Date().toISOString()
        }, { merge: true });
    }

    await batch.commit();

    return { success: true, message: "Účet bol úspešne prepojený" };
});
