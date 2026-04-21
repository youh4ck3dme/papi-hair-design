import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
} from "firebase-functions/v2/https";
import { queueAdminBookingNotificationEmail, queueCustomerBookingEmail } from "./emailQueue";
import {
  buildHistoryAccessUrl,
  createOpaqueToken,
  normalizeEmail,
  normalizePhone,
} from "./publicBookingAccess";
import { checkRateLimit } from "./middleware/rateLimit";
import { throwBookingError } from "./errors";
import { appendAppointmentStatusAuditEntry } from "./auditLog";

interface ConfirmBookingInput {
  appointment_id: string;
  confirm_token: string;
  idempotency_key?: string;
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

export const confirmBooking = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<ConfirmBookingInput>) => {
    const { appointment_id, confirm_token, idempotency_key } = request.data;
    const db = getFirestore();

    // Rate limit by IP
    const ip = extractClientIp(request.rawRequest) || "unknown";
    await checkRateLimit(ip);

    if (!appointment_id) {
      throwBookingError({
        status: "invalid-argument",
        code: "missing_fields",
        message: "Chýba appointment_id",
      });
    }

    if (!confirm_token) {
      throwBookingError({
        status: "invalid-argument",
        code: "missing_fields",
        message: "Chýba confirm_token",
      });
    }

    const docRef = db.collection("appointments").doc(appointment_id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throwBookingError({
        status: "not-found",
        code: "appointment_not_found",
        message: "Rezervácia nebola nájdená",
      });
    }

    const appt = snap.data() as Record<string, any>;
    if (appt.status !== "hold_created") {
      // Already confirmed or finished; return success idempotently
      return {
        success: true,
        appointment_id,
        status: appt.status,
        customer_email: appt.customer_email ?? null,
        customer_name: appt.customer_name ?? null,
      };
    }

    if (appt.confirm_token !== confirm_token) {
      throwBookingError({
        status: "permission-denied",
        code: "invalid_confirm_token",
        message: "Neplatný potvrdzovací token",
      });
    }

    if (appt.hold_expires_at) {
      const expires = new Date(appt.hold_expires_at).getTime();
      if (Date.now() > expires) {
        await docRef.update({ status: "expired", expired_at: new Date().toISOString() });
        throwBookingError({
          status: "failed-precondition",
          code: "hold_expired",
          message: "Rezervácia už vypršala",
        });
      }
    }

    const updates: Record<string, any> = {
      status: "confirmed",
      hold_expires_at: null,
      confirm_token: null, // Invalidate the token
      confirmed_at: new Date().toISOString(),
    };
    if (idempotency_key) {
      updates.idempotency_key = idempotency_key;
    }

    await docRef.update(updates);
    try {
      if (typeof appt.business_id === "string") {
        await appendAppointmentStatusAuditEntry(db, {
          appointmentId: appointment_id,
          businessId: appt.business_id,
          previousStatus: "hold_created",
          nextStatus: "confirmed",
          actorType: "system",
          actorUid: null,
        });
      }
    } catch (error) {
      functions.logger.warn("confirmBooking: failed to append status audit entry", {
        appointment_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let claim_token: string | null = null;
    let history_access_token: string | null = null;
    const businessId = typeof appt.business_id === "string" ? appt.business_id : "";
    const customerEmailRaw = typeof appt.customer_email === "string" ? appt.customer_email : "";
    const customerPhoneRaw = typeof appt.customer_phone === "string" ? appt.customer_phone : null;
    const customerName = typeof appt.customer_name === "string" ? appt.customer_name : null;

    if (businessId && customerEmailRaw) {
      const customerEmail = normalizeEmail(customerEmailRaw);
      const customerPhone = normalizePhone(customerPhoneRaw);
      const { token, tokenHash } = createOpaqueToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await db.collection("booking_claims").add({
        business_id: businessId,
        appointment_id,
        email: customerEmail,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
        created_at: new Date().toISOString(),
      });
      claim_token = token;

      const historyAccess = createOpaqueToken();
      await db.collection("booking_history_access").add({
        business_id: businessId,
        appointment_id,
        customer_id: typeof appt.customer_id === "string" ? appt.customer_id : null,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        token_hash: historyAccess.tokenHash,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
      history_access_token = historyAccess.token;

      try {
        await queueCustomerBookingEmail({
          businessId,
          appointmentId: appointment_id,
          customerEmail: customerEmail,
          customerName,
          serviceName: typeof appt.service_name === "string" ? appt.service_name : null,
          startAtIso: typeof appt.start_at === "string" ? appt.start_at : new Date().toISOString(),
          historyAccessUrl: buildHistoryAccessUrl(appointment_id, historyAccess.token),
        });
      } catch (err) {
        functions.logger.warn("confirmBooking: queue customer email failed", {
          appointment_id,
          business_id: businessId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      try {
        await queueAdminBookingNotificationEmail({
          businessId,
          appointmentId: appointment_id,
          customerName,
          customerEmail,
          customerPhone,
          serviceName: typeof appt.service_name === "string" ? appt.service_name : null,
          startAtIso: typeof appt.start_at === "string" ? appt.start_at : new Date().toISOString(),
        });
      } catch (err) {
        functions.logger.warn("confirmBooking: queue admin email failed", {
          appointment_id,
          business_id: businessId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: true,
      appointment_id,
      status: "confirmed",
      claim_token,
      history_access_token,
      history_reference: appointment_id,
      customer_email: customerEmailRaw || null,
      customer_name: customerName,
    };
  }
);
