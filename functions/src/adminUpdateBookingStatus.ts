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
import { queueCustomerCancellationEmail } from "./emailQueue";
import { appendAppointmentStatusAuditEntry } from "./auditLog";

interface AdminUpdateBookingStatusData {
  business_id: string;
  appointment_id: string;
  status: AdminBookingStatus;
}

export const adminUpdateBookingStatus = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<AdminUpdateBookingStatusData>) => {
    const uid = requireAuth(request.auth);
    const { business_id, appointment_id, status } = request.data;

    if (!business_id || !appointment_id || !status) {
      throw new HttpsError("invalid-argument", "Missing booking status payload");
    }

    await requireMembership(uid, business_id);
    assertValidAdminStatus(status);

    const db = getFirestore();
    const appointmentRef = db.collection("appointments").doc(appointment_id);
    const appointmentSnap = await appointmentRef.get();
    if (!appointmentSnap.exists) {
      throw new HttpsError("not-found", "Appointment not found");
    }

    const appointment = appointmentSnap.data() as Record<string, any>;
    if (appointment.business_id !== business_id) {
      throw new HttpsError("permission-denied", "Appointment does not belong to this business");
    }

    const currentStatus =
      typeof appointment.status === "string" ? appointment.status : "pending";
    ensureAllowedAdminTransition(currentStatus, status);

    if (currentStatus === status) {
      return {
        success: true,
        appointment_id,
        status,
      };
    }

    const nowIso = new Date().toISOString();
    await appointmentRef.update(buildBookingStatusUpdate(status, nowIso));

    try {
      await appendAppointmentStatusAuditEntry(db, {
        appointmentId: appointment_id,
        businessId: business_id,
        previousStatus: currentStatus,
        nextStatus: status,
        actorType: "admin",
        actorUid: uid,
      });
    } catch (error) {
      functions.logger.warn("adminUpdateBookingStatus: failed to append audit entry", {
        appointment_id,
        business_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (status === "cancelled" && typeof appointment.customer_email === "string" && appointment.customer_email.trim().length > 0) {
      try {
        await queueCustomerCancellationEmail({
          businessId: business_id,
          appointmentId: appointment_id,
          customerEmail: appointment.customer_email,
          customerName: typeof appointment.customer_name === "string" ? appointment.customer_name : null,
          serviceName: typeof appointment.service_name === "string" ? appointment.service_name : null,
          startAtIso: typeof appointment.start_at === "string" ? appointment.start_at : nowIso,
          cancelledBy: "admin",
        });
      } catch (error) {
        functions.logger.warn("adminUpdateBookingStatus: queue cancellation email failed", {
          appointment_id,
          business_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      appointment_id,
      status,
    };
  }
);
