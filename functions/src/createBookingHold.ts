import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
} from "firebase-functions/v2/https";
import * as crypto from "crypto";
import { assignEmployeeForSlot } from "./autoAssignEmployee";
import { normalizeEmail, normalizePhone } from "./publicBookingAccess";
import { checkRateLimit } from "./middleware/rateLimit";
import { throwBookingError } from "./errors";

interface CreateBookingHoldInput {
  business_id: string;
  service_id: string;
  employee_id?: string;
  start_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  idempotency_key?: string;
}

const HOLD_TTL_MS = 15 * 60 * 1000; // 15 minutes

function createIdempotencyKey(rawKey: string | undefined): string {
  const normalized = typeof rawKey === "string" ? rawKey.trim() : "";
  if (normalized.length > 0) {
    return normalized.slice(0, 200);
  }
  return crypto.randomUUID();
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

export const createBookingHold = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<CreateBookingHoldInput>) => {
    const { data } = request;
    const db = getFirestore();

    // Rate limit by IP
    const ip = extractClientIp(request.rawRequest) || "unknown";
    await checkRateLimit(ip);

    const {
      business_id,
      service_id,
      employee_id,
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
      throwBookingError({
        status: "invalid-argument",
        code: "missing_fields",
        message: "Chýbajú povinné polia rezervácie",
      });
    }

    const startDate = new Date(start_at);
    if (Number.isNaN(startDate.getTime())) {
      throwBookingError({
        status: "invalid-argument",
        code: "invalid_start_at",
        message: "Neplatný čas začiatku rezervácie",
      });
    }

    const now = Date.now();
    const holdExpiresAt = new Date(now + HOLD_TTL_MS);
    const idemKey = createIdempotencyKey(idempotency_key);
    const customerEmail = normalizeEmail(customer_email);
    const customerPhone = normalizePhone(customer_phone);
    const confirmToken = crypto.randomUUID();

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
      throwBookingError({
        status: "not-found",
        code: "service_not_found",
        message: "Služba nebola nájdená",
      });
    }

    const totalMinutes =
      (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    const assignedEmployee = await assignEmployeeForSlot({
      businessId: business_id,
      serviceId: service_id,
      startAtIso: startDate.toISOString(),
      endAtIso: endDate.toISOString(),
      preferredEmployeeId: employee_id ?? null,
    });

    if (!assignedEmployee) {
      throwBookingError({
        status: "already-exists",
        code: "slot_unavailable",
        message: "Vybraný termín už nie je dostupný",
      });
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
      throwBookingError({
        status: "already-exists",
        code: "slot_unavailable",
        message: "Vybraný termín už nie je dostupný",
      });
    }

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
