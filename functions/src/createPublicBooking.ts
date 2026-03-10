import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface CreatePublicBookingData {
    business_id: string;
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    idempotency_key?: string;
    recaptcha_token?: string | null;
}

interface RecaptchaVerifyResponse {
    success: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
}

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = 0.5;
const RECAPTCHA_EXPECTED_ACTION = "booking";

/** Normalize email: lowercase, strip + aliases */
function normalizeEmail(email: string): string {
    const [localRaw, domain] = email.toLowerCase().trim().split("@");
    if (!domain) return email.toLowerCase().trim();
    const local = localRaw.split("+")[0];
    return `${local}@${domain}`;
}

function extractClientIp(rawRequest: CallableRequest<unknown>["rawRequest"]): string | null {
    const forwarded = rawRequest.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim().length > 0) {
        return forwarded.split(",")[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0]?.trim() || null;
    }
    return rawRequest.socket.remoteAddress ?? null;
}

async function verifyRecaptchaIfConfigured(recaptchaToken: string | null | undefined, clientIp: string | null): Promise<void> {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET?.trim();
    if (!recaptchaSecret) return;

    if (!recaptchaToken || typeof recaptchaToken !== "string") {
        throw new HttpsError("invalid-argument", "Chýba reCAPTCHA token");
    }

    const payload = new URLSearchParams();
    payload.set("secret", recaptchaSecret);
    payload.set("response", recaptchaToken);
    if (clientIp) {
        payload.set("remoteip", clientIp);
    }

    let verification: RecaptchaVerifyResponse;
    try {
        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: payload.toString()
        });
        if (!response.ok) {
            throw new Error(`reCAPTCHA endpoint returned ${response.status}`);
        }
        verification = await response.json() as RecaptchaVerifyResponse;
    } catch (error) {
        throw new HttpsError("unavailable", "reCAPTCHA overenie zlyhalo");
    }

    if (!verification.success) {
        throw new HttpsError("permission-denied", "reCAPTCHA overenie neprešlo");
    }

    if (verification.action && verification.action !== RECAPTCHA_EXPECTED_ACTION) {
        throw new HttpsError("permission-denied", "Neplatná reCAPTCHA akcia");
    }

    const score = typeof verification.score === "number" ? verification.score : 0;
    if (score < RECAPTCHA_MIN_SCORE) {
        throw new HttpsError("permission-denied", "reCAPTCHA skóre je príliš nízke");
    }
}

import { checkRateLimit } from "./middleware/rateLimit";

export const createPublicBooking = functions.https.onCall({ region: "europe-west1" }, async (request: CallableRequest<CreatePublicBookingData>) => {
    const { data } = request;
    const db = getFirestore();

    // Rate limit by IP
    const ip = extractClientIp(request.rawRequest) || "unknown";
    await checkRateLimit(ip);

    // 0. Validation
    const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone, idempotency_key } = data;
    if (!business_id || !service_id || !employee_id || !start_at || !customer_name || !customer_email) {
        throw new HttpsError("invalid-argument", "Chýbajúce povinné polia");
    }

    await verifyRecaptchaIfConfigured(data.recaptcha_token, extractClientIp(request.rawRequest));

    const sanitizedEmail = normalizeEmail(customer_email);
    const idemKey = (idempotency_key && idempotency_key.trim()) || crypto.randomUUID();
    const startDate = new Date(start_at);
    if (isNaN(startDate.getTime())) {
        throw new HttpsError("invalid-argument", "Neplatný dátum");
    }

    // Idempotency: if appointment with same key exists, return it
    const existingSnap = await db.collection("appointments")
        .where("idempotency_key", "==", idemKey)
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        return {
            success: true,
            appointment_id: existing.id,
            claim_token: null,
            customer_email: sanitizedEmail,
            customer_name: customer_name.trim(),
            reused: true
        };
    }

    // 1. Get service & employee
    const [serviceSnap, employeeSnap] = await Promise.all([
        db.collection("services").doc(service_id).get(),
        db.collection("employees").doc(employee_id).get()
    ]);

    const service = serviceSnap.data();
    const employee = employeeSnap.data();

    if (!service || !service.is_active || service.business_id !== business_id) {
        throw new HttpsError("not-found", "Služba nebola nájdená");
    }
    if (!employee || !employee.is_active || employee.business_id !== business_id) {
        throw new HttpsError("not-found", "Zamestnanec nebol nájdený");
    }

    // 2. Calculate end time & check conflicts
    const totalMinutes = (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    const conflictCandidatesSnap = await db.collection("appointments")
        .where("employee_id", "==", employee_id)
        .where("start_at", "<", endDate.toISOString())
        .limit(50)
        .get();

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const hasConflict = conflictCandidatesSnap.docs.some((docSnap) => {
        const conflict = docSnap.data();
        if (conflict.status === "cancelled") return false;

        const conflictStart = new Date(conflict.start_at).getTime();
        const conflictEnd = new Date(conflict.end_at).getTime();
        if (Number.isNaN(conflictStart) || Number.isNaN(conflictEnd)) return false;

        return conflictStart < endMs && conflictEnd > startMs;
    });

    if (hasConflict) {
        throw new HttpsError("already-exists", "Tento termín je už obsadený");
    }

    // 3. Find or create customer
    const customersSnap = await db.collection("customers")
        .where("business_id", "==", business_id)
        .where("email", "==", sanitizedEmail)
        .limit(1)
        .get();

    let customerId: string;
    if (!customersSnap.empty) {
        customerId = customersSnap.docs[0].id;
        await db.collection("customers").doc(customerId).update({
            full_name: customer_name.trim(),
            phone: customer_phone || null
        });
    } else {
        const newCust = await db.collection("customers").add({
            business_id,
            full_name: customer_name.trim(),
            email: sanitizedEmail,
            phone: customer_phone || null,
            created_at: new Date().toISOString()
        });
        customerId = newCust.id;
    }

    // 4. Create appointment
    const appointment = await db.collection("appointments").add({
        business_id,
        customer_id: customerId,
        customer_name: customer_name.trim(),
        customer_email: sanitizedEmail,
        customer_phone: customer_phone || null,
        employee_id,
        employee_name: employee.display_name || "?",
        employee_color: employee.color || null,
        service_id,
        service_name: service.name_sk || "?",
        service_price: service.price || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: "confirmed",
        idempotency_key: idemKey,
        created_at: new Date().toISOString()
    });

    // 5. Generate claim token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.collection("booking_claims").add({
        business_id,
        appointment_id: appointment.id,
        email: sanitizedEmail,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
    });

    // 6. Trigger email/notifications (In a real app, use Pub/Sub or similar)
    // For the blueprint, we can call them here or use a helper.
    // We'll assume the email function will be implemented separately.

    return {
        success: true,
        appointment_id: appointment.id,
        claim_token: token as string,
        customer_email: sanitizedEmail,
        customer_name: customer_name.trim(),
        reused: false,
    };
});
