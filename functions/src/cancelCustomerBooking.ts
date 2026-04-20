import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { appendAppointmentStatusAuditEntry } from "./auditLog";
import { buildBookingStatusUpdate } from "./bookingStatus";
import {
  isAppointmentVisibleToHistoryContext,
  resolveHistoryContext,
} from "./bookingHistoryAccess";
import {
  queueAdminCustomerCancellationEmail,
  queueCustomerCancellationEmail,
} from "./emailQueue";
import { buildHistoryAccessUrl } from "./publicBookingAccess";

interface CancelCustomerBookingData {
  access_token?: string;
  reference?: string;
  email?: string;
  phone?: string;
  appointment_id?: string;
}

function parseCancellationHours(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
}

export const cancelCustomerBooking = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<CancelCustomerBookingData>) => {
    const accessToken = request.data?.access_token?.trim() || null;
    const context = await resolveHistoryContext({
      access_token: accessToken ?? undefined,
      reference: request.data?.reference,
      email: request.data?.email,
      phone: request.data?.phone,
    });

    const appointmentId = request.data?.appointment_id?.trim() || context.reference;
    if (!appointmentId) {
      throw new HttpsError("invalid-argument", "Chýba referencia rezervácie");
    }

    const db = getFirestore();
    const appointmentRef = db.collection("appointments").doc(appointmentId);
    const appointmentSnap = await appointmentRef.get();
    if (!appointmentSnap.exists) {
      throw new HttpsError("not-found", "Rezervácia nebola nájdená");
    }

    const appointment = appointmentSnap.data() as Record<string, any>;
    if (appointment.business_id !== context.businessId) {
      throw new HttpsError("permission-denied", "Rezervácia nepatrí k tejto prevádzke");
    }

    if (!isAppointmentVisibleToHistoryContext(appointment, context)) {
      throw new HttpsError("permission-denied", "Rezervácia nepatrí k tomuto kontaktu");
    }

    const currentStatus =
      typeof appointment.status === "string" ? appointment.status : "pending";

    if (currentStatus === "cancelled") {
      return {
        success: true,
        appointment_id: appointmentId,
        status: currentStatus,
      };
    }

    if (currentStatus === "completed" || currentStatus === "no_show" || currentStatus === "expired") {
      throw new HttpsError("failed-precondition", "Rezerváciu už nie je možné zrušiť");
    }

    const businessSnap = await db.collection("businesses").doc(context.businessId).get();
    if (!businessSnap.exists) {
      throw new HttpsError("not-found", "Prevádzka nebola nájdená");
    }

    const business = businessSnap.data() as Record<string, any>;
    const cancellationHours = parseCancellationHours(business.cancellation_hours);
    const startAtIso = typeof appointment.start_at === "string" ? appointment.start_at : null;
    if (!startAtIso) {
      throw new HttpsError("failed-precondition", "Rezervácia nemá platný dátum");
    }

    const startMs = new Date(startAtIso).getTime();
    if (!Number.isFinite(startMs)) {
      throw new HttpsError("failed-precondition", "Rezervácia nemá platný dátum");
    }

    if (cancellationHours > 0) {
      const deadlineMs = startMs - cancellationHours * 60 * 60 * 1000;
      if (Date.now() > deadlineMs) {
        throw new HttpsError(
          "failed-precondition",
          `Rezerváciu je možné zrušiť najneskôr ${cancellationHours} hodín pred termínom`
        );
      }
    }

    const nowIso = new Date().toISOString();
    await appointmentRef.update(
      buildBookingStatusUpdate("cancelled", nowIso, { cancelledBy: "customer" })
    );

    try {
      await appendAppointmentStatusAuditEntry(db, {
        appointmentId,
        businessId: context.businessId,
        previousStatus: currentStatus,
        nextStatus: "cancelled",
        actorType: "system",
        actorUid: null,
      });
    } catch (error) {
      functions.logger.warn("cancelCustomerBooking: failed to append audit entry", {
        appointment_id: appointmentId,
        business_id: context.businessId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const customerEmail = typeof appointment.customer_email === "string"
      ? appointment.customer_email
      : context.customerEmail;
    const customerPhone = typeof appointment.customer_phone === "string"
      ? appointment.customer_phone
      : context.customerPhone;
    const customerName = typeof appointment.customer_name === "string"
      ? appointment.customer_name
      : null;
    const serviceName = typeof appointment.service_name === "string"
      ? appointment.service_name
      : null;
    const historyAccessUrl = accessToken
      ? buildHistoryAccessUrl(context.reference, accessToken)
      : null;

    try {
      await queueCustomerCancellationEmail({
        businessId: context.businessId,
        appointmentId,
        customerEmail,
        customerName,
        serviceName,
        startAtIso,
        cancelledBy: "customer",
        historyAccessUrl,
      });
    } catch (error) {
      functions.logger.warn("cancelCustomerBooking: queue customer cancellation email failed", {
        appointment_id: appointmentId,
        business_id: context.businessId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await queueAdminCustomerCancellationEmail({
        businessId: context.businessId,
        appointmentId,
        customerEmail,
        customerPhone,
        customerName,
        serviceName,
        startAtIso,
        cancelledBy: "customer",
      });
    } catch (error) {
      functions.logger.warn("cancelCustomerBooking: queue admin cancellation email failed", {
        appointment_id: appointmentId,
        business_id: context.businessId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      success: true,
      appointment_id: appointmentId,
      status: "cancelled",
    };
  }
);
