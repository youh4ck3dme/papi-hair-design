import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import * as crypto from "crypto";
import { assignEmployeeForSlot } from "./autoAssignEmployee";
import { normalizeEmail, normalizePhone } from "./publicBookingAccess";
import { checkRateLimit } from "./middleware/rateLimit";

interface CreateBookingHoldInput {
  business_id: string;
  service_id: string;
  employee_id?: string;
  start_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  idempotency_key?: string;
  recaptcha_token?: string | null;
}

const HOLD_TTL_MS = 15 * 60 * 1000; // 15 minutes

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

export const createBookingHold = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<CreateBookingHoldInput>) => {
    const { data } = request;
    const db = getFirestore();

    // Rate limit by IP
    const ip = extractClientIp(request.rawRequest) || "unknown";
    await checkRateLimit(ip);

    // Verify reCAPTCHA
    await verifyRecaptchaIfConfigured(data.recaptcha_token, extractClientIp(request.rawRequest));

    const {
      business_id,
      service_id,
      start_at,
      customer_name,
      customer_email,
      customer_phone,
      idempotency_key,
    } = data;

    if (
      !business_id ||
      !service_id ||
      !start_at ||
      !customer_name ||
      !customer_email
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const startDate = new Date(start_at);
    if (Number.isNaN(startDate.getTime())) {
      throw new HttpsError("invalid-argument", "Invalid start_at");
    }

    const now = Date.now();
    const holdExpiresAt = new Date(now + HOLD_TTL_MS);
    const idemKey = createIdempotencyKey(idempotency_key);
    const customerEmail = normalizeEmail(customer_email);
    const customerPhone = normalizePhone(customer_phone);
    const confirmToken = crypto.randomUUID();

    // Rate limiting check
    const clientIp = extractClientIp(request.rawRequest);
    const rateLimitCheck = await checkRateLimit(db, request, "createBookingHold");
    if (!rateLimitCheck.success) {
      throw new HttpsError("resource-exhausted", rateLimitCheck.message);
    }

    // Idempotency: return existing hold for the same key
    const existingSnap = await db
      .collection("appointments")
      .where("idempotency_key", "==", idemKey)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      return { success: true, appointment_id: doc.id, reused: true, confirm_token: doc.data().confirm_token };
    }

    // Load service and auto-assign eligible employee
    const serviceSnap = await db.collection("services").doc(service_id).get();
    const service = serviceSnap.data();
    if (!service || service.business_id !== business_id) {
      throw new HttpsError("not-found", "Service not found");
    }

    const totalMinutes =
      (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    const assignedEmployee = await assignEmployeeForSlot({
      businessId: business_id,
      serviceId: service_id,
      startAtIso: startDate.toISOString(),
      endAtIso: endDate.toISOString(),
    });

    if (!assignedEmployee) {
      throw new HttpsError("already-exists", "Slot is not available");
    }

    // Conflict detection with index-safe query shape.
    // We query a bounded candidate set and apply overlap/status checks in memory.
    const conflictCandidatesSnap = await db
      .collection("appointments")
      .where("employee_id", "==", assignedEmployee.id)
      .where("start_at", "<", endDate.toISOString())
      .limit(50)
      .get();

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const hasActiveConflict = conflictCandidatesSnap.docs.some((docSnap) => {
      const conflict = docSnap.data();
      if (conflict.status === "cancelled") return false;
      if (
        conflict.status === "hold_created" &&
        conflict.hold_expires_at &&
        new Date(conflict.hold_expires_at).getTime() < now
      ) {
        return false;
      }

      const conflictStart = new Date(conflict.start_at).getTime();
      const conflictEnd = new Date(conflict.end_at).getTime();
      if (Number.isNaN(conflictStart) || Number.isNaN(conflictEnd)) return false;

      return conflictStart < endMs && conflictEnd > startMs;
    });

    if (hasActiveConflict) {
      throw new HttpsError("already-exists", "Slot is not available");
    }

    // Verify reCAPTCHA
    await verifyRecaptchaIfConfigured(recaptcha_token, clientIp);

    // Find or create customer
    const customersSnap = await db
      .collection("customers")
      .where("business_id", "==", business_id)
      .where("email", "==", customerEmail)
      .limit(1)
      .get();
    let customerId: string;
    if (!customersSnap.empty) {
      customerId = customersSnap.docs[0].id;
      await db.collection("customers").doc(customerId).update({
        full_name: customer_name.trim(),
        phone: customerPhone,
        updated_at: new Date().toISOString(),
      });
    } else {
      const newCust = await db.collection("customers").add({
        business_id,
        full_name: customer_name.trim(),
        email: customerEmail,
        phone: customerPhone,
        created_at: new Date().toISOString(),
      });
      customerId = newCust.id;
    }

    const appointmentRef = await db.collection("appointments").add({
      business_id,
      customer_id: customerId,
      customer_name: customer_name.trim(),
      customer_email: customerEmail,
      customer_phone: customerPhone,
      employee_id: assignedEmployee.id,
      employee_name: assignedEmployee.display_name || "?",
      employee_color: assignedEmployee.color || null,
      service_id,
      service_name: service.name_sk || "?",
      service_price: service.price || null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      status: "hold_created",
      hold_expires_at: holdExpiresAt.toISOString(),
      confirm_token: confirmToken,
      idempotency_key: idemKey,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      appointment_id: appointmentRef.id,
      hold_expires_at: holdExpiresAt.toISOString(),
      confirm_token: confirmToken,
      idempotency_key: idemKey,
      reused: false,
    };
  }
);
