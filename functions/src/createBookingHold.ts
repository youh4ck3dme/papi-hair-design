import * as functions from "firebase-functions/v2";
import * as crypto from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
} from "firebase-functions/v2/https";
import { assignEmployeeForSlot } from "./autoAssignEmployee";
import { getClientIp } from "./clientIp";
import { createOpaqueToken, normalizeEmail, normalizePhone } from "./publicBookingAccess";
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

type CustomerRecordStatus = "existing" | "created";

const HOLD_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SLOT_LOCK_BUCKET_MS = 15 * 60 * 1000;

function createIdempotencyKey(rawKey: string | undefined): string {
  const normalized = typeof rawKey === "string" ? rawKey.trim() : "";
  if (normalized.length > 0) {
    return normalized.slice(0, 200);
  }
  return createOpaqueToken().token;
}

function createDocumentKey(prefix: string, rawValue: string): string {
  return `${prefix}_${crypto.createHash("sha256").update(rawValue).digest("hex")}`;
}

function createSlotLockIds(params: {
  businessId: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
}): string[] {
  const startMs = params.startDate.getTime();
  const endMs = params.endDate.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return [];

  const ids: string[] = [];
  let cursor = Math.floor(startMs / SLOT_LOCK_BUCKET_MS) * SLOT_LOCK_BUCKET_MS;
  while (cursor < endMs) {
    ids.push(
      createDocumentKey(
        "slot",
        JSON.stringify([
          params.businessId,
          params.employeeId,
          new Date(cursor).toISOString(),
        ])
      )
    );
    cursor += SLOT_LOCK_BUCKET_MS;
  }

  return ids;
}

function isAppointmentBlocking(appointment: Record<string, any>, now: number): boolean {
  if (appointment.status === "cancelled" || appointment.status === "expired") {
    return false;
  }

  if (
    appointment.status === "hold_created" &&
    appointment.hold_expires_at &&
    new Date(appointment.hold_expires_at).getTime() < now
  ) {
    return false;
  }

  return true;
}

function toReusedHoldResponse(docId: string, appointment: Record<string, any>) {
  const customerRecordStatus = appointment.customer_record_status;
  return {
    success: true,
    appointment_id: docId,
    reused: true,
    confirm_token: typeof appointment.confirm_token === "string" ? appointment.confirm_token : undefined,
    customer_record_status:
      customerRecordStatus === "existing" || customerRecordStatus === "created"
        ? customerRecordStatus
        : undefined,
  };
}

export const createBookingHold = functions.https.onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<CreateBookingHoldInput>) => {
    const { data } = request;
    const db = getFirestore();

    // Rate limit by IP
    const ip = getClientIp(request.rawRequest) || "unknown";
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
    const confirmToken = createOpaqueToken().token;

    // Backward-compatible idempotency lookup for appointments created before
    // booking_idempotency documents were introduced.
    const existingSnap = await db
      .collection("appointments")
      .where("idempotency_key", "==", idemKey)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      return toReusedHoldResponse(doc.id, doc.data());
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

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const slotLockIds = createSlotLockIds({
      businessId: business_id,
      employeeId: assignedEmployee.id,
      startDate,
      endDate,
    });
    if (!slotLockIds.length) {
      throwBookingError({
        status: "invalid-argument",
        code: "invalid_start_at",
        message: "Neplatný rozsah rezervácie",
      });
    }

    const nowIso = new Date().toISOString();
    const idempotencyRef = db
      .collection("booking_idempotency")
      .doc(createDocumentKey("booking", idemKey));
    const appointmentRef = db.collection("appointments").doc();
    const slotLockRefs = slotLockIds.map((id) => db.collection("booking_slot_locks").doc(id));

    return db.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotencyRef);
      if (idempotencySnap.exists) {
        const existingAppointmentId = idempotencySnap.data()?.appointment_id;
        if (typeof existingAppointmentId === "string" && existingAppointmentId) {
          const existingAppointmentSnap = await transaction.get(
            db.collection("appointments").doc(existingAppointmentId)
          );
          if (existingAppointmentSnap.exists) {
            return toReusedHoldResponse(existingAppointmentSnap.id, existingAppointmentSnap.data() ?? {});
          }
        }
      }

      const slotLockSnaps = await Promise.all(slotLockRefs.map((ref) => transaction.get(ref)));
      const lockedAppointmentIds = Array.from(
        new Set(
          slotLockSnaps
            .map((snap) => snap.data()?.appointment_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      );
      const lockedAppointmentSnaps = await Promise.all(
        lockedAppointmentIds.map((appointmentId) =>
          transaction.get(db.collection("appointments").doc(appointmentId))
        )
      );
      const hasActiveSlotLock = lockedAppointmentSnaps.some((snap) => {
        if (!snap.exists) return false;
        return isAppointmentBlocking(snap.data() ?? {}, now);
      });

      if (hasActiveSlotLock) {
        throwBookingError({
          status: "already-exists",
          code: "slot_unavailable",
          message: "Vybraný termín už nie je dostupný",
        });
      }

      // Conflict detection with index-safe query shape for legacy appointments
      // that do not have slot lock documents yet.
      const conflictCandidatesSnap = await transaction.get(
        db
          .collection("appointments")
          .where("employee_id", "==", assignedEmployee.id)
          .where("start_at", "<", endDate.toISOString())
          .limit(50)
      );

      const hasActiveConflict = conflictCandidatesSnap.docs.some((docSnap) => {
        const conflict = docSnap.data();
        if (!isAppointmentBlocking(conflict, now)) return false;

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

      const customersSnap = await transaction.get(
        db
          .collection("customers")
          .where("business_id", "==", business_id)
          .where("email", "==", customerEmail)
          .limit(1)
      );

      let customerId: string;
      let customerRecordStatus: CustomerRecordStatus;
      if (!customersSnap.empty) {
        const customerRef = customersSnap.docs[0].ref;
        customerId = customerRef.id;
        customerRecordStatus = "existing";
        transaction.update(customerRef, {
          full_name: customer_name.trim(),
          phone: customerPhone,
          updated_at: nowIso,
        });
      } else {
        const newCustomerRef = db.collection("customers").doc();
        customerId = newCustomerRef.id;
        customerRecordStatus = "created";
        transaction.set(newCustomerRef, {
          business_id,
          full_name: customer_name.trim(),
          email: customerEmail,
          phone: customerPhone,
          created_at: nowIso,
        });
      }

      const appointmentPayload = {
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
        customer_record_status: customerRecordStatus,
        hold_expires_at: holdExpiresAt.toISOString(),
        confirm_token: confirmToken,
        idempotency_key: idemKey,
        created_at: nowIso,
      };

      transaction.set(appointmentRef, appointmentPayload);
      slotLockRefs.forEach((slotLockRef, index) => {
        const bucketStartMs =
          Math.floor(startMs / SLOT_LOCK_BUCKET_MS) * SLOT_LOCK_BUCKET_MS +
          index * SLOT_LOCK_BUCKET_MS;
        transaction.set(slotLockRef, {
          business_id,
          employee_id: assignedEmployee.id,
          appointment_id: appointmentRef.id,
          bucket_start_at: new Date(bucketStartMs).toISOString(),
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          status: "hold_created",
          hold_expires_at: holdExpiresAt.toISOString(),
          idempotency_key: idemKey,
          created_at: nowIso,
          updated_at: nowIso,
        });
      });
      transaction.set(idempotencyRef, {
        business_id,
        appointment_id: appointmentRef.id,
        idempotency_key: idemKey,
        created_at: nowIso,
        updated_at: nowIso,
      });

      return {
        success: true,
        appointment_id: appointmentRef.id,
        hold_expires_at: holdExpiresAt.toISOString(),
        confirm_token: confirmToken,
        idempotency_key: idemKey,
        reused: false,
        customer_record_status: customerRecordStatus,
      };
    });
  }
);
