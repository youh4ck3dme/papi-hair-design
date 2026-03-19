import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import { queueAdminBookingNotificationEmail, queueCustomerBookingEmail } from "./emailQueue";
import {
  buildHistoryAccessUrl,
  createOpaqueToken,
  normalizeEmail,
  normalizePhone,
} from "./publicBookingAccess";
import { checkRateLimit } from "./middleware/rateLimit";

interface ConfirmBookingInput {
  appointment_id: string;
  confirm_token: string;
  idempotency_key?: string;
  recaptcha_token?: string | null;
}

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = 0.5;
const RECAPTCHA_EXPECTED_ACTION = "booking";

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

function extractClientIp(rawRequest: CallableRequest<unknown>["rawRequest"]): string | null {
  const forwarded = rawRequest.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.trim() || null;
  }
  return rawRequest.socket.remoteAddress ?? null;
}

async function verifyRecaptchaIfConfigured(recaptchaToken: string | null | undefined, clientIp: string | null): Promise<void> {
  const recaptchaSecret = process.env.RECAPTCHA_SECRET?.trim();
  if (!recaptchaSecret) return;

  if (!recaptchaToken || typeof recaptchaToken !== "string") {
    throw new HttpsError("invalid-argument", "Chýba reCAPTCHA token");
  }

  const payload = new URLSearchParams();
  payload.set("secret", recaptchaSecret);
  payload.set("response", recaptchaToken);
  if (clientIp) {
    payload.set("remoteip", clientIp);
  }

  let verification: RecaptchaVerifyResponse;
  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    });
    if (!response.ok) {
      throw new Error(`reCAPTCHA endpoint returned ${response.status}`);
    }
    verification = await response.json() as RecaptchaVerifyResponse;
  } catch (error) {
    throw new HttpsError("unavailable", "reCAPTCHA overenie zlyhalo");
  }

  if (!verification.success) {
    throw new HttpsError("permission-denied", "reCAPTCHA overenie neprešlo");
  }

  if (verification.action && verification.action !== RECAPTCHA_EXPECTED_ACTION) {
    throw new HttpsError("permission-denied", "Neplatná reCAPTCHA akcia");
  }

  const score = typeof verification.score === "number" ? verification.score : 0;
  if (score < RECAPTCHA_MIN_SCORE) {
    throw new HttpsError("permission-denied", "reCAPTCHA skóre je príliš nízke");
  }
}

export const confirmBooking = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<ConfirmBookingInput>) => {
    const { appointment_id, confirm_token, idempotency_key, recaptcha_token } = request.data;
    const db = getFirestore();

    // Rate limit by IP
    const ip = extractClientIp(request.rawRequest) || "unknown";
    await checkRateLimit(ip);

    // Verify reCAPTCHA
    await verifyRecaptchaIfConfigured(recaptcha_token, extractClientIp(request.rawRequest));

    if (!appointment_id) {
      throw new HttpsError("invalid-argument", "Missing appointment_id");
    }

    if (!confirm_token) {
      throw new HttpsError("invalid-argument", "Missing confirm_token");
    }

    const clientIp = extractClientIp(request.rawRequest);
    try {
      await verifyRecaptchaIfConfigured(recaptcha_token, clientIp);
    } catch (err) {
      functions.logger.warn("confirmBooking: reCAPTCHA verification failed", {
        appointment_id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const rateLimitExceeded = await checkRateLimit(
      "confirmBooking",
      request.rawRequest,
      { appointment_id }
    );
    if (rateLimitExceeded) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded");
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

    if (appt.confirm_token !== confirm_token) {
      throw new HttpsError("permission-denied", "Invalid confirm_token");
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
      confirm_token: null, // Invalidate the token
      confirmed_at: new Date().toISOString(),
    };
    if (idempotency_key) {
      updates.idempotency_key = idempotency_key;
    }

    await docRef.update(updates);

    let claim_token: string | null = null;
    let history_access_token: string | null = null;
    const businessId = typeof appt.business_id === "string" ? appt.business_id : "";
    const customerEmailRaw = typeof appt.customer_email === "string" ? appt.customer_email : "";
    const customerPhoneRaw = typeof appt.customer_phone === "string" ? appt.customer_phone : null;
    const customerName = typeof appt.customer_name === "string" ? appt.customer_name : null;

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
    };
  }
);
