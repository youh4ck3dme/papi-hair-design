import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import { requireAuth, requireMembership } from "./guards";
import { upsertSecret } from "./secretManager";

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

    const uid = requireAuth(auth);

    const { business_id, host, port, user: smtpUser, from, pass } = data;

    if (!business_id) {
        throw new HttpsError("invalid-argument", "Missing business_id");
    }

    // Verify user is admin/owner of this business
    await requireMembership(uid, business_id, ["owner", "admin"]);

    // Validate inputs
    const sanitized: Record<string, any> = {
        host: typeof host === "string" ? host.trim().slice(0, 255) : "",
        port: Number(port) || 465,
        user: typeof smtpUser === "string" ? smtpUser.trim().slice(0, 255) : "",
        from: typeof from === "string" ? from.trim().slice(0, 255) : "",
    };

    // Handle password via Secret Manager, not Firestore
    let hasPassword = false;
    if (typeof pass === "string" && pass.length > 0) {
        const secretName = await upsertSecret(`smtp-password-${business_id}`, pass);
        sanitized.password_secret = secretName;
        hasPassword = true;
    } else {
        const bizSnap = await db.collection("businesses").doc(business_id).get();
        const existing = (bizSnap.data()?.smtp_config as Record<string, any>) ?? {};
        if (existing?.password_secret) {
            sanitized.password_secret = existing.password_secret;
            hasPassword = true;
        }
    }

    await db.collection("businesses").doc(business_id).update({
        smtp_config: {
            ...sanitized,
            has_password: hasPassword
        },
        updated_at: new Date().toISOString()
    });

    return { success: true };
});
