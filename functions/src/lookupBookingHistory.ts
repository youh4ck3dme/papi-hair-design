import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import {
  hashOpaqueToken,
  normalizeEmail,
  normalizePhone,
} from "./publicBookingAccess";

interface LookupBookingHistoryData {
  access_token?: string;
  reference?: string;
  email?: string;
  phone?: string;
}

interface HistoryAccessRecord {
  appointment_id?: string;
  business_id?: string;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string | null;
  expires_at?: string | null;
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresMs) && expiresMs < Date.now();
}

async function resolveHistoryContext(data: LookupBookingHistoryData): Promise<{
  businessId: string;
  customerId: string | null;
  customerEmail: string;
  customerPhone: string | null;
  reference: string;
}> {
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

  const appointment = referenceSnap.data() as {
    business_id?: string;
    customer_id?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
  };

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

export const lookupBookingHistory = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<LookupBookingHistoryData>) => {
    const db = getFirestore();
    const context = await resolveHistoryContext(request.data);

    let appointmentsSnap;
    if (context.customerId) {
      appointmentsSnap = await db
        .collection("appointments")
        .where("business_id", "==", context.businessId)
        .where("customer_id", "==", context.customerId)
        .get();
    } else {
      appointmentsSnap = await db
        .collection("appointments")
        .where("business_id", "==", context.businessId)
        .where("customer_email", "==", context.customerEmail)
        .get();
    }

    const items = appointmentsSnap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as {
          service_name?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          status?: string | null;
          service_price?: number | null;
          customer_email?: string | null;
          customer_phone?: string | null;
        }),
      }))
      .filter((appointment) => {
        if (context.customerId) return true;
        const appointmentPhone = normalizePhone(appointment.customer_phone ?? null);
        if (!context.customerPhone || !appointmentPhone) {
          return normalizeEmail(appointment.customer_email ?? "") === context.customerEmail;
        }
        return (
          normalizeEmail(appointment.customer_email ?? "") === context.customerEmail &&
          appointmentPhone === context.customerPhone
        );
      })
      .sort((left, right) => (right.start_at ?? "").localeCompare(left.start_at ?? ""))
      .map((appointment) => ({
        id: appointment.id,
        service_name: appointment.service_name ?? null,
        start_at: appointment.start_at ?? null,
        end_at: appointment.end_at ?? null,
        status: appointment.status ?? "pending",
        service_price: appointment.service_price ?? null,
        is_reference: appointment.id === context.reference,
      }));

    return {
      success: true,
      customer_email: context.customerEmail,
      customer_phone: context.customerPhone,
      reference: context.reference,
      appointments: items,
    };
  }
);
