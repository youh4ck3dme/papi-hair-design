import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  hashOpaqueToken,
  normalizeEmail,
  normalizePhone,
} from "./publicBookingAccess";

export interface BookingHistoryLookupInput {
  access_token?: string;
  reference?: string;
  email?: string;
  phone?: string;
}

export interface BookingHistoryContext {
  businessId: string;
  customerId: string | null;
  customerEmail: string;
  customerPhone: string | null;
  reference: string;
}

interface HistoryAccessRecord {
  appointment_id?: string;
  business_id?: string;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string | null;
  expires_at?: string | null;
}

export interface HistoryVisibleAppointment {
  business_id?: string | null;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresMs) && expiresMs < Date.now();
}

export function isAppointmentVisibleToHistoryContext(
  appointment: HistoryVisibleAppointment,
  context: BookingHistoryContext
): boolean {
  if (context.customerId) {
    return appointment.customer_id === context.customerId;
  }

  const normalizedAppointmentEmail = normalizeEmail(appointment.customer_email ?? "");
  if (normalizedAppointmentEmail !== context.customerEmail) {
    return false;
  }

  const normalizedAppointmentPhone = normalizePhone(appointment.customer_phone ?? null);
  if (!context.customerPhone || !normalizedAppointmentPhone) {
    return true;
  }

  return normalizedAppointmentPhone === context.customerPhone;
}

export async function resolveHistoryContext(
  data: BookingHistoryLookupInput
): Promise<BookingHistoryContext> {
  const db = getFirestore();

  if (data.access_token) {
    const tokenHash = hashOpaqueToken(data.access_token);
    const accessSnap = await db
      .collection("booking_history_access")
      .where("token_hash", "==", tokenHash)
      .limit(1)
      .get();

    if (accessSnap.empty) {
      throw new HttpsError("not-found", "Prístupový odkaz nie je platný");
    }

    const access = accessSnap.docs[0].data() as HistoryAccessRecord;
    if (!access.business_id || !access.appointment_id || !access.customer_email) {
      throw new HttpsError("failed-precondition", "Prístupové údaje sú neúplné");
    }

    if (isExpired(access.expires_at)) {
      throw new HttpsError("failed-precondition", "Prístupový odkaz expiroval");
    }

    return {
      businessId: access.business_id,
      customerId: access.customer_id ?? null,
      customerEmail: access.customer_email,
      customerPhone: access.customer_phone ?? null,
      reference: access.appointment_id,
    };
  }

  if (!data.reference || !data.email) {
    throw new HttpsError("invalid-argument", "Chýba referencia alebo email");
  }

  const referenceSnap = await db.collection("appointments").doc(data.reference).get();
  if (!referenceSnap.exists) {
    throw new HttpsError("not-found", "Rezervácia nebola nájdená");
  }

  const appointment = referenceSnap.data() as HistoryVisibleAppointment;
  const normalizedEmail = normalizeEmail(data.email);
  const normalizedStoredEmail = normalizeEmail(appointment.customer_email ?? "");
  if (!normalizedStoredEmail || normalizedStoredEmail !== normalizedEmail) {
    throw new HttpsError("permission-denied", "Email sa nezhoduje s rezerváciou");
  }

  const normalizedStoredPhone = normalizePhone(appointment.customer_phone ?? null);
  const normalizedProvidedPhone = normalizePhone(data.phone ?? null);
  if (normalizedStoredPhone && normalizedStoredPhone !== normalizedProvidedPhone) {
    throw new HttpsError("permission-denied", "Telefónne číslo sa nezhoduje s rezerváciou");
  }

  if (!appointment.business_id) {
    throw new HttpsError("failed-precondition", "Rezervácia nemá priradenú prevádzku");
  }

  return {
    businessId: appointment.business_id,
    customerId: appointment.customer_id ?? null,
    customerEmail: normalizedStoredEmail,
    customerPhone: normalizedStoredPhone,
    reference: data.reference,
  };
}
