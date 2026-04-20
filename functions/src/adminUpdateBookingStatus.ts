import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { requireAuth, requireMembership } from "./guards";
import {
  assertValidAdminStatus,
  buildBookingStatusUpdate,
  ensureAllowedAdminTransition,
  type AdminBookingStatus,
} from "./bookingStatus";
import { queueAdminCustomerCancellationEmail, queueCustomerCancellationEmail } from "./emailQueue";
import { appendAppointmentStatusAuditEntry } from "./auditLog";

interface AdminUpdateBookingStatusData {
  business_id: string;
  appointment_id: string;
  status: AdminBookingStatus;
}

function resolveStatusPayload(data: AdminUpdateBookingStatusData) {
  const { business_id, appointment_id, status } = data;
  if (!business_id || !appointment_id || !status) {
    throw new HttpsError("invalid-argument", "Missing booking status payload");
  }

  return { businessId: business_id, appointmentId: appointment_id, status };
}

async function loadBusinessAppointment(
  db: FirebaseFirestore.Firestore,
  appointmentId: string,
  businessId: string
): Promise<Record<string, any>> {
  const appointmentSnap = await db.collection("appointments").doc(appointmentId).get();
  if (!appointmentSnap.exists) {
    throw new HttpsError("not-found", "Appointment not found");
  }

  const appointment = appointmentSnap.data() as Record<string, any>;
  if (appointment.business_id !== businessId) {
    throw new HttpsError("permission-denied", "Appointment does not belong to this business");
  }

  return appointment;
}

function resolveAppointmentStatus(appointment: Record<string, any>): string {
  return typeof appointment.status === "string" ? appointment.status : "pending";
}

async function appendAdminStatusAudit(
  db: FirebaseFirestore.Firestore,
  appointmentId: string,
  businessId: string,
  previousStatus: string,
  nextStatus: string,
  uid: string
) {
  try {
    await appendAppointmentStatusAuditEntry(db, {
      appointmentId,
      businessId,
      previousStatus,
      nextStatus,
      actorType: "admin",
      actorUid: uid,
    });
  } catch (error) {
    functions.logger.warn("adminUpdateBookingStatus: failed to append audit entry", {
      appointment_id: appointmentId,
      business_id: businessId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function resolveCancellationEmailPayload(appointment: Record<string, any>, fallbackStartAtIso: string) {
  const customerEmail = typeof appointment.customer_email === "string" ? appointment.customer_email.trim() : "";
  if (!customerEmail) {
    return null;
  }

  return {
    customerEmail,
    customerName: typeof appointment.customer_name === "string" ? appointment.customer_name : null,
    customerPhone: typeof appointment.customer_phone === "string" ? appointment.customer_phone : null,
    serviceName: typeof appointment.service_name === "string" ? appointment.service_name : null,
    startAtIso: typeof appointment.start_at === "string" ? appointment.start_at : fallbackStartAtIso,
  };
}

async function queueAdminCancellationNotifications(input: {
  businessId: string;
  appointmentId: string;
  appointment: Record<string, any>;
  fallbackStartAtIso: string;
}) {
  const payload = resolveCancellationEmailPayload(input.appointment, input.fallbackStartAtIso);
  if (!payload) {
    return;
  }

  try {
    await queueCustomerCancellationEmail({
      businessId: input.businessId,
      appointmentId: input.appointmentId,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      serviceName: payload.serviceName,
      startAtIso: payload.startAtIso,
      cancelledBy: "admin",
    });
  } catch (error) {
    functions.logger.warn("adminUpdateBookingStatus: queue cancellation email failed", {
      appointment_id: input.appointmentId,
      business_id: input.businessId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await queueAdminCustomerCancellationEmail({
      businessId: input.businessId,
      appointmentId: input.appointmentId,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      customerName: payload.customerName,
      serviceName: payload.serviceName,
      startAtIso: payload.startAtIso,
      cancelledBy: "admin",
    });
  } catch (error) {
    functions.logger.warn("adminUpdateBookingStatus: queue admin cancellation email failed", {
      appointment_id: input.appointmentId,
      business_id: input.businessId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const adminUpdateBookingStatus = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<AdminUpdateBookingStatusData>) => {
    const uid = requireAuth(request.auth);
    const { businessId, appointmentId, status } = resolveStatusPayload(request.data);

    await requireMembership(uid, businessId);
    assertValidAdminStatus(status);

    const db = getFirestore();
    const appointmentRef = db.collection("appointments").doc(appointmentId);
    const appointment = await loadBusinessAppointment(db, appointmentId, businessId);
    const currentStatus = resolveAppointmentStatus(appointment);
    ensureAllowedAdminTransition(currentStatus, status);

    if (currentStatus === status) {
      return {
        success: true,
        appointment_id: appointmentId,
        status,
      };
    }

    const nowIso = new Date().toISOString();
    await appointmentRef.update(
      buildBookingStatusUpdate(status, nowIso, status === "cancelled" ? { cancelledBy: "admin" } : {})
    );

    await appendAdminStatusAudit(db, appointmentId, businessId, currentStatus, status, uid);

    if (status === "cancelled") {
      await queueAdminCancellationNotifications({
        businessId,
        appointmentId,
        appointment,
        fallbackStartAtIso: nowIso,
      });
    }

    return {
      success: true,
      appointment_id: appointmentId,
      status,
    };
  }
);
