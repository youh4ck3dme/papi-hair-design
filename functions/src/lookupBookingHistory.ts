import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { type CallableRequest } from "firebase-functions/v2/https";
import {
  BookingHistoryLookupInput,
  isAppointmentVisibleToHistoryContext,
  resolveHistoryContext,
} from "./bookingHistoryAccess";

export const lookupBookingHistory = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<BookingHistoryLookupInput>) => {
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
          customer_id?: string | null;
        }),
      }))
      .filter((appointment) => isAppointmentVisibleToHistoryContext(appointment, context))
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
