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

type BookingHistoryContext = Awaited<ReturnType<typeof resolveHistoryContext>>;

function parseCancellationHours(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
}

function resolveAppointmentId(inputAppointmentId: string | undefined, fallbackReference: string | null): string {
  const appointmentId = inputAppointmentId?.trim() || fallbackReference;
  if (!appointmentId) {
    throw new HttpsError("invalid-argument", "Chýba referencia rezervácie");
  }

  return appointmentId;
}

async function loadAppointment(
  db: FirebaseFirestore.Firestore,
  appointmentId: string
): Promise<{
  appointmentRef: FirebaseFirestore.DocumentReference;
  appointment: Record<string, any>;
}> {
  const appointmentRef = db.collection("appointments").doc(appointmentId);
  const appointmentSnap = await appointmentRef.get();

  if (!appointmentSnap.exists) {
    throw new HttpsError("not-found", "Rezervácia nebola nájdená");
  }

  return {
    appointmentRef,
    appointment: appointmentSnap.data() as Record<string, any>,
  };
}

function assertAppointmentAccessible(
  appointment: Record<string, any>,
  context: BookingHistoryContext
) {
  if (appointment.business_id !== context.businessId) {
    throw new HttpsError("permission-denied", "Rezervácia nepatrí k tejto prevádzke");
  }

  if (!isAppointmentVisibleToHistoryContext(appointment, context)) {
    throw new HttpsError("permission-denied", "Rezervácia nepatrí k tomuto kontaktu");
  }
}

function resolveCurrentStatus(appointment: Record<string, any>): string {
  return typeof appointment.status === "string" ? appointment.status : "pending";
}

function assertBookingCanBeCancelled(currentStatus: string) {
  if (currentStatus === "completed" || currentStatus === "no_show" || currentStatus === "expired") {
    throw new HttpsError("failed-precondition", "Rezerváciu už nie je možné zrušiť");
  }
}

async function loadBusiness(
  db: FirebaseFirestore.Firestore,
  businessId: string
): Promise<Record<string, any>> {
  const businessSnap = await db.collection("businesses").doc(businessId).get();
  if (!businessSnap.exists) {
    throw new HttpsError("not-found", "Prevádzka nebola nájdená");
  }

  return businessSnap.data() as Record<string, any>;
}

function resolveStartAtIso(appointment: Record<string, any>): string {
  const startAtIso = typeof appointment.start_at === "string" ? appointment.start_at : null;
  if (!startAtIso) {
    throw new HttpsError("failed-precondition", "Rezervácia nemá platný dátum");
  }

  const startMs = new Date(startAtIso).getTime();
  if (!Number.isFinite(startMs)) {
    throw new HttpsError("failed-precondition", "Rezervácia nemá platný dátum");
  }

  return startAtIso;
}

function assertCancellationWindow(startAtIso: string, cancellationHours: number) {
  if (cancellationHours <= 0) {
    return;
  }

  const startMs = new Date(startAtIso).getTime();
  const deadlineMs = startMs - cancellationHours * 60 * 60 * 1000;
  if (Date.now() > deadlineMs) {
    throw new HttpsError(
      "failed-precondition",
      `Rezerváciu je možné zrušiť najneskôr ${cancellationHours} hodín pred termínom`
    );
  }
}

async function appendCancellationAudit(
  db: FirebaseFirestore.Firestore,
  appointmentId: string,
  businessId: string,
  previousStatus: string
) {
  try {
    await appendAppointmentStatusAuditEntry(db, {
      appointmentId,
      businessId,
      previousStatus,
      nextStatus: "cancelled",
      actorType: "system",
      actorUid: null,
    });
  } catch (error) {
    functions.logger.warn("cancelCustomerBooking: failed to append audit entry", {
      appointment_id: appointmentId,
      business_id: businessId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function resolveCustomerDetails(
  appointment: Record<string, any>,
  context: BookingHistoryContext
) {
  return {
    customerEmail:
      typeof appointment.customer_email === "string"
        ? appointment.customer_email
        : context.customerEmail,
    customerPhone:
      typeof appointment.customer_phone === "string"
        ? appointment.customer_phone
        : context.customerPhone,
    customerName:
      typeof appointment.customer_name === "string"
        ? appointment.customer_name
        : null,
    serviceName:
      typeof appointment.service_name === "string"
        ? appointment.service_name
        : null,
  };
}

async function queueCancellationNotifications(input: {
  businessId: string;
  appointmentId: string;
  startAtIso: string;
  historyAccessUrl: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  serviceName: string | null;
}) {
  if (input.customerEmail) {
    try {
      await queueCustomerCancellationEmail({
        businessId: input.businessId,
        appointmentId: input.appointmentId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        serviceName: input.serviceName,
        startAtIso: input.startAtIso,
        cancelledBy: "customer",
        historyAccessUrl: input.historyAccessUrl,
      });
    } catch (error) {
      functions.logger.warn("cancelCustomerBooking: queue customer cancellation email failed", {
        appointment_id: input.appointmentId,
        business_id: input.businessId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await queueAdminCustomerCancellationEmail({
      businessId: input.businessId,
      appointmentId: input.appointmentId,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      serviceName: input.serviceName,
      startAtIso: input.startAtIso,
      cancelledBy: "customer",
    });
  } catch (error) {
    functions.logger.warn("cancelCustomerBooking: queue admin cancellation email failed", {
      appointment_id: input.appointmentId,
      business_id: input.businessId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

    const appointmentId = resolveAppointmentId(request.data?.appointment_id, context.reference);
    const db = getFirestore();
    const { appointmentRef, appointment } = await loadAppointment(db, appointmentId);
    assertAppointmentAccessible(appointment, context);
    const currentStatus = resolveCurrentStatus(appointment);

    if (currentStatus === "cancelled") {
      return {
        success: true,
        appointment_id: appointmentId,
        status: currentStatus,
      };
    }

    assertBookingCanBeCancelled(currentStatus);
    const business = await loadBusiness(db, context.businessId);
    const cancellationHours = parseCancellationHours(business.cancellation_hours);
    const startAtIso = resolveStartAtIso(appointment);
    assertCancellationWindow(startAtIso, cancellationHours);

    const nowIso = new Date().toISOString();
    await appointmentRef.update(
      buildBookingStatusUpdate("cancelled", nowIso, { cancelledBy: "customer" })
    );

    await appendCancellationAudit(db, appointmentId, context.businessId, currentStatus);

    const { customerEmail, customerPhone, customerName, serviceName } = resolveCustomerDetails(
      appointment,
      context
    );
    const historyAccessUrl = accessToken
      ? buildHistoryAccessUrl(context.reference, accessToken)
      : null;

    await queueCancellationNotifications({
      businessId: context.businessId,
      appointmentId,
      startAtIso,
      historyAccessUrl,
      customerEmail,
      customerPhone,
      customerName,
      serviceName,
    });

    return {
      success: true,
      appointment_id: appointmentId,
      status: "cancelled",
    };
  }
);
