import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";
import * as crypto from "crypto";
import { queueAdminBookingNotificationEmail, queueCustomerBookingEmail } from "./emailQueue";
import { assignEmployeeForSlot } from "./autoAssignEmployee";
import {
    buildHistoryAccessUrl,
    createOpaqueToken,
    normalizeEmail,
    normalizePhone,
} from "./publicBookingAccess";
import { requireAuth, requireMembership } from "./guards";

interface CreatePublicBookingData {
    business_id: string;
    service_id: string;
    employee_id?: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    note?: string | null;
    payment_method?: string | null;
    idempotency_key?: string;
    admin_mode?: boolean;
}

interface CreatePublicBookingResult {
    success: boolean;
    appointment_id: string;
    claim_token: string | null;
    history_access_token?: string | null;
    history_reference?: string | null;
    customer_email: string;
    customer_name: string;
    reused: boolean;
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

import { checkRateLimit } from "./middleware/rateLimit";

export const createPublicBooking = functions.https.onCall({ region: "europe-west1" }, async (request: CallableRequest<CreatePublicBookingData>) => {
    const { data } = request;
    const db = getFirestore();

    // Rate limit by IP
    const ip = extractClientIp(request.rawRequest) || "unknown";
    const adminMode = request.data?.admin_mode === true;
    if (!adminMode) {
        await checkRateLimit(ip);
    }

    // 0. Validation
    const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone, note, payment_method, idempotency_key } = data;
    if (!business_id || !service_id || !start_at || !customer_name || !customer_email) {
        throw new HttpsError("invalid-argument", "Chýbajúce povinné polia");
    }

    if (adminMode) {
        const uid = requireAuth(request.auth);
        await requireMembership(uid, business_id, ["owner", "admin"]);
    }

    const sanitizedEmail = normalizeEmail(customer_email);
    const sanitizedPhone = normalizePhone(customer_phone);
    const sanitizedNote = typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
    const sanitizedPaymentMethod = typeof payment_method === "string" && payment_method.trim().length > 0 ? payment_method.trim() : null;
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
        const reusedResponse: CreatePublicBookingResult = {
            success: true,
            appointment_id: existing.id,
            claim_token: null,
            history_access_token: null,
            history_reference: existing.id,
            customer_email: sanitizedEmail,
            customer_name: customer_name.trim(),
            reused: true
        };
        return reusedResponse;
    }

    // 1. Get service and auto-assign eligible employee
    const serviceSnap = await db.collection("services").doc(service_id).get();
    const service = serviceSnap.data();

    if (!service || !service.is_active || service.business_id !== business_id) {
        throw new HttpsError("not-found", "Služba nebola nájdená");
    }

    // 2. Calculate end time & check conflicts
    const totalMinutes = (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    const assignedEmployee = await assignEmployeeForSlot({
        businessId: business_id,
        serviceId: service_id,
        startAtIso: startDate.toISOString(),
        endAtIso: endDate.toISOString(),
        preferredEmployeeId: employee_id ?? null,
    });

    if (!assignedEmployee) {
        throw new HttpsError("already-exists", "Tento termín je už obsadený");
    }

    const conflictCandidatesSnap = await db.collection("appointments")
        .where("employee_id", "==", assignedEmployee.id)
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
            phone: sanitizedPhone
        });
    } else {
        const newCust = await db.collection("customers").add({
            business_id,
            full_name: customer_name.trim(),
            email: sanitizedEmail,
            phone: sanitizedPhone,
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
        customer_phone: sanitizedPhone,
        employee_id: assignedEmployee.id,
        employee_name: assignedEmployee.display_name || "?",
        employee_color: assignedEmployee.color || null,
        service_id,
        service_name: service.name_sk || "?",
        service_price: service.price || null,
        note: sanitizedNote,
        payment_method: sanitizedPaymentMethod,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: "confirmed",
        idempotency_key: idemKey,
        created_at: new Date().toISOString()
    });

    // 5. Generate customer-facing access only for public bookings
    let token: string | null = null;
    let historyToken: string | null = null;
    if (!adminMode) {
        const claimToken = createOpaqueToken();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const historyAccess = createOpaqueToken();

        await db.collection("booking_claims").add({
            business_id,
            appointment_id: appointment.id,
            email: sanitizedEmail,
            token_hash: claimToken.tokenHash,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        });

        await db.collection("booking_history_access").add({
            business_id,
            appointment_id: appointment.id,
            customer_id: customerId,
            customer_email: sanitizedEmail,
            customer_phone: sanitizedPhone,
            token_hash: historyAccess.tokenHash,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
        });

        token = claimToken.token;
        historyToken = historyAccess.token;
    }

    // 6. Queue customer confirmation email document for firestore-send-email extension
    try {
        if (!adminMode) {
            await queueCustomerBookingEmail({
                businessId: business_id,
                appointmentId: appointment.id,
                customerEmail: sanitizedEmail,
                customerName: customer_name.trim(),
                serviceName: typeof service.name_sk === "string" ? service.name_sk : null,
                startAtIso: startDate.toISOString(),
                endAtIso: endDate.toISOString(),
                historyAccessUrl: historyToken ? buildHistoryAccessUrl(appointment.id, historyToken) : null,
            });
        }
    } catch (err) {
        functions.logger.warn("createPublicBooking: queue customer email failed", {
            appointment_id: appointment.id,
            business_id,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    if (!adminMode) {
        try {
            await queueAdminBookingNotificationEmail({
                businessId: business_id,
                appointmentId: appointment.id,
                customerName: customer_name.trim(),
                customerEmail: sanitizedEmail,
                customerPhone: sanitizedPhone,
                serviceName: typeof service.name_sk === "string" ? service.name_sk : null,
                startAtIso: startDate.toISOString(),
            });
        } catch (err) {
            functions.logger.warn("createPublicBooking: queue admin email failed", {
                appointment_id: appointment.id,
                business_id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    const createdResponse: CreatePublicBookingResult = {
        success: true,
        appointment_id: appointment.id,
        claim_token: token,
        history_access_token: historyToken,
        history_reference: adminMode ? null : appointment.id,
        customer_email: sanitizedEmail,
        customer_name: customer_name.trim(),
        reused: false,
    };
    return createdResponse;
});
