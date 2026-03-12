"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPublicBooking = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
const emailQueue_1 = require("./emailQueue");
const autoAssignEmployee_1 = require("./autoAssignEmployee");
const publicBookingAccess_1 = require("./publicBookingAccess");
const guards_1 = require("./guards");
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = 0.5;
const RECAPTCHA_EXPECTED_ACTION = "booking";
function extractClientIp(rawRequest) {
    const forwarded = rawRequest.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim().length > 0) {
        return forwarded.split(",")[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0]?.trim() || null;
    }
    return rawRequest.socket.remoteAddress ?? null;
}
async function verifyRecaptchaIfConfigured(recaptchaToken, clientIp) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET?.trim();
    if (!recaptchaSecret)
        return;
    if (!recaptchaToken || typeof recaptchaToken !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Chýba reCAPTCHA token");
    }
    const payload = new URLSearchParams();
    payload.set("secret", recaptchaSecret);
    payload.set("response", recaptchaToken);
    if (clientIp) {
        payload.set("remoteip", clientIp);
    }
    let verification;
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
        verification = await response.json();
    }
    catch (error) {
        throw new https_1.HttpsError("unavailable", "reCAPTCHA overenie zlyhalo");
    }
    if (!verification.success) {
        throw new https_1.HttpsError("permission-denied", "reCAPTCHA overenie neprešlo");
    }
    if (verification.action && verification.action !== RECAPTCHA_EXPECTED_ACTION) {
        throw new https_1.HttpsError("permission-denied", "Neplatná reCAPTCHA akcia");
    }
    const score = typeof verification.score === "number" ? verification.score : 0;
    if (score < RECAPTCHA_MIN_SCORE) {
        throw new https_1.HttpsError("permission-denied", "reCAPTCHA skóre je príliš nízke");
    }
}
const rateLimit_1 = require("./middleware/rateLimit");
exports.createPublicBooking = functions.https.onCall({ region: "europe-west1" }, async (request) => {
    const { data } = request;
    const db = (0, firestore_1.getFirestore)();
    const ip = extractClientIp(request.rawRequest) || "unknown";
    const adminMode = request.data?.admin_mode === true;
    if (!adminMode) {
        await (0, rateLimit_1.checkRateLimit)(ip);
    }
    const { business_id, service_id, start_at, customer_name, customer_email, customer_phone, note, payment_method, idempotency_key } = data;
    if (!business_id || !service_id || !start_at || !customer_name || !customer_email) {
        throw new https_1.HttpsError("invalid-argument", "Chýbajúce povinné polia");
    }
    if (adminMode) {
        const uid = (0, guards_1.requireAuth)(request.auth);
        await (0, guards_1.requireMembership)(uid, business_id, ["owner", "admin"]);
    }
    else {
        await verifyRecaptchaIfConfigured(data.recaptcha_token, extractClientIp(request.rawRequest));
    }
    const sanitizedEmail = (0, publicBookingAccess_1.normalizeEmail)(customer_email);
    const sanitizedPhone = (0, publicBookingAccess_1.normalizePhone)(customer_phone);
    const sanitizedNote = typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
    const sanitizedPaymentMethod = typeof payment_method === "string" && payment_method.trim().length > 0 ? payment_method.trim() : null;
    const idemKey = (idempotency_key && idempotency_key.trim()) || crypto.randomUUID();
    const startDate = new Date(start_at);
    if (isNaN(startDate.getTime())) {
        throw new https_1.HttpsError("invalid-argument", "Neplatný dátum");
    }
    const existingSnap = await db.collection("appointments")
        .where("idempotency_key", "==", idemKey)
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        const reusedResponse = {
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
    const serviceSnap = await db.collection("services").doc(service_id).get();
    const service = serviceSnap.data();
    if (!service || !service.is_active || service.business_id !== business_id) {
        throw new https_1.HttpsError("not-found", "Služba nebola nájdená");
    }
    const totalMinutes = (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);
    const assignedEmployee = await (0, autoAssignEmployee_1.assignEmployeeForSlot)({
        businessId: business_id,
        serviceId: service_id,
        startAtIso: startDate.toISOString(),
        endAtIso: endDate.toISOString(),
    });
    if (!assignedEmployee) {
        throw new https_1.HttpsError("already-exists", "Tento termín je už obsadený");
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
        if (conflict.status === "cancelled")
            return false;
        const conflictStart = new Date(conflict.start_at).getTime();
        const conflictEnd = new Date(conflict.end_at).getTime();
        if (Number.isNaN(conflictStart) || Number.isNaN(conflictEnd))
            return false;
        return conflictStart < endMs && conflictEnd > startMs;
    });
    if (hasConflict) {
        throw new https_1.HttpsError("already-exists", "Tento termín je už obsadený");
    }
    const customersSnap = await db.collection("customers")
        .where("business_id", "==", business_id)
        .where("email", "==", sanitizedEmail)
        .limit(1)
        .get();
    let customerId;
    if (!customersSnap.empty) {
        customerId = customersSnap.docs[0].id;
        await db.collection("customers").doc(customerId).update({
            full_name: customer_name.trim(),
            phone: sanitizedPhone
        });
    }
    else {
        const newCust = await db.collection("customers").add({
            business_id,
            full_name: customer_name.trim(),
            email: sanitizedEmail,
            phone: sanitizedPhone,
            created_at: new Date().toISOString()
        });
        customerId = newCust.id;
    }
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
    let token = null;
    let historyToken = null;
    if (!adminMode) {
        const claimToken = (0, publicBookingAccess_1.createOpaqueToken)();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const historyAccess = (0, publicBookingAccess_1.createOpaqueToken)();
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
    try {
        if (!adminMode) {
            await (0, emailQueue_1.queueCustomerBookingEmail)({
                businessId: business_id,
                appointmentId: appointment.id,
                customerEmail: sanitizedEmail,
                customerName: customer_name.trim(),
                serviceName: typeof service.name_sk === "string" ? service.name_sk : null,
                startAtIso: startDate.toISOString(),
                historyAccessUrl: historyToken ? (0, publicBookingAccess_1.buildHistoryAccessUrl)(appointment.id, historyToken) : null,
            });
        }
    }
    catch (err) {
        functions.logger.warn("createPublicBooking: queue customer email failed", {
            appointment_id: appointment.id,
            business_id,
            error: err instanceof Error ? err.message : String(err),
        });
    }
    if (!adminMode) {
        try {
            await (0, emailQueue_1.queueAdminBookingNotificationEmail)({
                businessId: business_id,
                appointmentId: appointment.id,
                customerName: customer_name.trim(),
                customerEmail: sanitizedEmail,
                customerPhone: sanitizedPhone,
                serviceName: typeof service.name_sk === "string" ? service.name_sk : null,
                startAtIso: startDate.toISOString(),
            });
        }
        catch (err) {
            functions.logger.warn("createPublicBooking: queue admin email failed", {
                appointment_id: appointment.id,
                business_id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    const createdResponse = {
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
//# sourceMappingURL=createPublicBooking.js.map