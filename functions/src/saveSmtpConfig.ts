import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";

interface SaveSmtpConfigData {
    business_id: string;
    host: string;
    port: number | string;
    user: string;
    from: string;
    pass?: string;
}

export const saveSmtpConfig = functions.https.onCall({ region: "europe-west1" }, async (request: CallableRequest<SaveSmtpConfigData>) => {
    const { auth, data } = request;
    const db = getFirestore();

    if (!auth) {
        throw new HttpsError("unauthenticated", "Neautorizovaný prístup");
    }

    const { business_id, host, port, user: smtpUser, from, pass } = data;

    if (!business_id) {
        throw new HttpsError("invalid-argument", "Missing business_id");
    }

    // Verify user is admin/owner of this business
    const membershipSnap = await db.collection("memberships")
        .where("business_id", "==", business_id)
        .where("profile_id", "==", auth.uid)
        .limit(1)
        .get();

    if (membershipSnap.empty) {
        throw new HttpsError("permission-denied", "Forbidden – access denied");
    }

    const membership = membershipSnap.docs[0].data();
    if (membership.role !== "owner" && membership.role !== "admin") {
        throw new HttpsError("permission-denied", "Forbidden – admin only");
    }

    // Validate inputs
    const sanitized: Record<string, any> = {
        host: typeof host === "string" ? host.trim().slice(0, 255) : "",
        port: Number(port) || 465,
        user: typeof smtpUser === "string" ? smtpUser.trim().slice(0, 255) : "",
        from: typeof from === "string" ? from.trim().slice(0, 255) : "",
    };

    // If pass is provided, include it. Otherwise load existing.
    if (typeof pass === "string" && pass.length > 0) {
        sanitized.pass = pass.slice(0, 500);
    } else {
        // Keep existing password
        const bizSnap = await db.collection("businesses").doc(business_id).get();
        const bizData = bizSnap.data();
        const existing = (bizData?.smtp_config as Record<string, any>) ?? {};
        sanitized.pass = existing.pass ?? "";
    }

    await db.collection("businesses").doc(business_id).update({
        smtp_config: sanitized,
        updated_at: new Date().toISOString()
    });

    return { success: true };
});
