import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface ConfirmBookingInput {
  appointment_id: string;
  idempotency_key?: string;
}

function normalizeEmail(email: string): string {
  const [localRaw, domain] = email.toLowerCase().trim().split("@");
  if (!domain) return email.toLowerCase().trim();
  const local = localRaw.split("+")[0];
  return `${local}@${domain}`;
}

function makeClaimToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
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
      return {
        success: true,
        appointment_id,
        status: appt.status,
        customer_email: appt.customer_email ?? null,
        customer_name: appt.customer_name ?? null,
      };
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

    let claim_token: string | null = null;
    const businessId = typeof appt.business_id === "string" ? appt.business_id : "";
    const customerEmailRaw = typeof appt.customer_email === "string" ? appt.customer_email : "";
    const customerName = typeof appt.customer_name === "string" ? appt.customer_name : null;

    if (businessId && customerEmailRaw) {
      const customerEmail = normalizeEmail(customerEmailRaw);
      const { token, tokenHash } = makeClaimToken();
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
    }

    return {
      success: true,
      appointment_id,
      status: "confirmed",
      claim_token,
      customer_email: customerEmailRaw || null,
      customer_name: customerName,
    };
  }
);
