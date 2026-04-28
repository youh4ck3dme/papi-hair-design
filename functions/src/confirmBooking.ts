import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
} from "firebase-functions/v2/https";
import { queueAdminBookingNotificationEmail, queueCustomerBookingEmail } from "./emailQueue";
import { getClientIp } from "./clientIp";
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

type CustomerRecordStatus = "existing" | "created" | null;

function normalizeIdempotencyKey(rawKey: string | undefined): string | undefined {
  const normalized = typeof rawKey === "string" ? rawKey.trim() : "";
  return normalized.length > 0 ? normalized.slice(0, 200) : undefined;
}

function resolveCustomerRecordStatus(value: unknown): CustomerRecordStatus {
  return value === "existing" ? "existing" : value === "created" ? "created" : null;
}

function buildConfirmedResponse(params: {
  appointmentId: string;
  status: unknown;
  appointment: Record<string, any>;
}) {
  return {
    success: true,
    appointment_id: params.appointmentId,
    status: typeof params.status === "string" ? params.status : "confirmed",
    customer_email: params.appointment.customer_email ?? null,
    customer_name: params.appointment.customer_name ?? null,
    customer_record_status: resolveCustomerRecordStatus(params.appointment.customer_record_status),
  };
}

export const confirmBooking = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<ConfirmBookingInput>) => {
    const { appointment_id, confirm_token, idempotency_key } = request.data;
    const db = getFirestore();
    const idemKey = normalizeIdempotencyKey(idempotency_key);

    // Rate limit by IP
    const ip = getClientIp(request.rawRequest) || "unknown";
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
    const transition = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) {
        throwBookingError({
          status: "not-found",
          code: "appointment_not_found",
          message: "Rezervácia nebola nájdená",
        });
      }

      const appt = snap.data() as Record<string, any>;
      const existingIdemKey = typeof appt.idempotency_key === "string" ? appt.idempotency_key : undefined;
      if (appt.status !== "hold_created") {
        if (existingIdemKey && existingIdemKey !== idemKey) {
          throwBookingError({
            status: "permission-denied",
            code: "invalid_idempotency_key",
            message: "Neplatný idempotency kľúč",
          });
        }

        return {
          confirmedNow: false,
          expired: false,
          appointment: appt,
          status: appt.status,
        };
      }

      if (appt.confirm_token !== confirm_token) {
        throwBookingError({
          status: "permission-denied",
          code: "invalid_confirm_token",
          message: "Neplatný potvrdzovací token",
        });
      }

      if (existingIdemKey && idemKey && existingIdemKey !== idemKey) {
        throwBookingError({
          status: "permission-denied",
          code: "invalid_idempotency_key",
          message: "Neplatný idempotency kľúč",
        });
      }

      const nowIso = new Date().toISOString();
      if (appt.hold_expires_at) {
        const expires = new Date(appt.hold_expires_at).getTime();
        if (Date.now() > expires) {
          transaction.update(docRef, { status: "expired", expired_at: nowIso });
          return {
            confirmedNow: false,
            expired: true,
            appointment: appt,
            status: "expired",
          };
        }
      }

      const updates: Record<string, any> = {
        status: "confirmed",
        hold_expires_at: null,
        confirm_token: null,
        confirmed_at: nowIso,
      };
      if (idemKey) {
        updates.idempotency_key = idemKey;
      }

      transaction.update(docRef, updates);
      return {
        confirmedNow: true,
        expired: false,
        appointment: {
          ...appt,
          ...updates,
        },
        status: "confirmed",
      };
    });

    if (transition.expired) {
      throwBookingError({
        status: "failed-precondition",
        code: "hold_expired",
        message: "Rezervácia už vypršala",
      });
    }

    const appt = transition.appointment;
    if (!transition.confirmedNow) {
      return buildConfirmedResponse({
        appointmentId: appointment_id,
        status: transition.status,
        appointment: appt,
      });
    }

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
    const customerRecordStatus: CustomerRecordStatus =
      appt.customer_record_status === "existing"
        ? "existing"
        : appt.customer_record_status === "created"
          ? "created"
          : null;

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
          endAtIso: typeof appt.end_at === "string" ? appt.end_at : null,
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
      customer_record_status: customerRecordStatus,
    };
  }
);
