import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface CreateBookingHoldInput {
  business_id: string;
  service_id: string;
  employee_id: string;
  start_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  idempotency_key?: string;
}

const HOLD_TTL_MS = 15 * 60 * 1000; // 15 minutes

function normalizeEmail(email: string): string {
  const [localRaw, domain] = email.toLowerCase().trim().split("@");
  if (!domain) return email.toLowerCase().trim();
  const local = localRaw.split("+")[0];
  return `${local}@${domain}`;
}

function createIdempotencyKey(input?: string): string {
  if (input && typeof input === "string" && input.trim().length > 0) {
    return input.trim();
  }
  return crypto.randomUUID();
}

export const createBookingHold = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<CreateBookingHoldInput>) => {
    const { data } = request;
    const db = getFirestore();

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
      !employee_id ||
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

    // Idempotency: return existing hold for the same key
    const existingSnap = await db
      .collection("appointments")
      .where("idempotency_key", "==", idemKey)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      return { success: true, appointment_id: doc.id, reused: true };
    }

    // Load service and employee
    const [serviceSnap, employeeSnap] = await Promise.all([
      db.collection("services").doc(service_id).get(),
      db.collection("employees").doc(employee_id).get(),
    ]);
    const service = serviceSnap.data();
    const employee = employeeSnap.data();
    if (!service || service.business_id !== business_id) {
      throw new HttpsError("not-found", "Service not found");
    }
    if (!employee || employee.business_id !== business_id) {
      throw new HttpsError("not-found", "Employee not found");
    }

    const totalMinutes =
      (service.duration_minutes || 30) + (service.buffer_minutes || 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    // Conflict detection with index-safe query shape.
    // We query a bounded candidate set and apply overlap/status checks in memory.
    const conflictCandidatesSnap = await db
      .collection("appointments")
      .where("employee_id", "==", employee_id)
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
        phone: customer_phone || null,
        updated_at: new Date().toISOString(),
      });
    } else {
      const newCust = await db.collection("customers").add({
        business_id,
        full_name: customer_name.trim(),
        email: customerEmail,
        phone: customer_phone || null,
        created_at: new Date().toISOString(),
      });
      customerId = newCust.id;
    }

    const appointmentRef = await db.collection("appointments").add({
      business_id,
      customer_id: customerId,
      customer_name: customer_name.trim(),
      customer_email: customerEmail,
      customer_phone: customer_phone || null,
      employee_id,
      employee_name: employee.display_name || "?",
      employee_color: employee.color || null,
      service_id,
      service_name: service.name_sk || "?",
      service_price: service.price || null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      status: "hold_created",
      hold_expires_at: holdExpiresAt.toISOString(),
      idempotency_key: idemKey,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      appointment_id: appointmentRef.id,
      hold_expires_at: holdExpiresAt.toISOString(),
      idempotency_key: idemKey,
      reused: false,
    };
  }
);
