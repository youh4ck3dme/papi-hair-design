import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface ConsentEventData {
    business_id?: string;
    subject_type: "anon_user" | "authenticated_user" | "session";
    subject_id: string;
    action: "accept" | "reject" | "update" | "withdraw";
    categories: string[];
    source: "web" | "app";
    metadata?: Record<string, any>;
}

export const consentEvent = functions.https.onCall({ region: "europe-west1" }, async (request: CallableRequest<ConsentEventData>) => {
    const { data, rawRequest } = request;
    const db = getFirestore();

    const { action, subject_type, subject_id, categories, source, business_id, metadata } = data;

    // Validation
    if (!action || !subject_type || !categories || !source) {
        throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const userAgent = rawRequest.headers["user-agent"]?.slice(0, 512) || null;
    const clientIp = rawRequest.headers["x-forwarded-for"] || rawRequest.socket.remoteAddress || null;
    const ipHash = clientIp ? crypto.createHash("sha256").update(String(clientIp)).digest("hex") : null;

    const event = {
        business_id: business_id || null,
        subject_type,
        subject_id: subject_id || null,
        action,
        categories,
        source,
        user_agent: userAgent,
        ip_hash: ipHash,
        metadata: metadata || {},
        created_at: new Date().toISOString()
    };

    const docRef = await db.collection("consent_events").add(event);

    return { ok: true, id: docRef.id };
});
