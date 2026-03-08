import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";

interface ConfirmBookingInput {
  appointment_id: string;
  idempotency_key?: string;
}

export const confirmBooking = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<ConfirmBookingInput>) => {
    const { appointment_id, idempotency_key } = request.data;
    const db = getFirestore();

    if (!appointment_id) {
      throw new HttpsError("invalid-argument", "Missing appointment_id");
    }

    const docRef = db.collection("appointments").doc(appointment_id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Appointment not found");
    }

    const appt = snap.data() as Record<string, any>;
    if (appt.status !== "hold_created") {
      // Already confirmed or finished; return success idempotently
      return { success: true, appointment_id, status: appt.status };
    }

    if (appt.hold_expires_at) {
      const expires = new Date(appt.hold_expires_at).getTime();
      if (Date.now() > expires) {
        await docRef.update({ status: "expired", expired_at: new Date().toISOString() });
        throw new HttpsError("failed-precondition", "Hold expired");
      }
    }

    const updates: Record<string, any> = {
      status: "confirmed",
      hold_expires_at: null,
      confirmed_at: new Date().toISOString(),
    };
    if (idempotency_key) {
      updates.idempotency_key = idempotency_key;
    }

    await docRef.update(updates);
    return { success: true, appointment_id, status: "confirmed" };
  }
);
