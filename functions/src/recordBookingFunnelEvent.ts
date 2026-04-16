import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, CallableRequest, onCall } from "firebase-functions/v2/https";

const ALLOWED_EVENTS = new Set([
  "booking_started",
  "category_selected",
  "subcategory_selected",
  "service_selected",
  "employee_selected",
  "slot_selected",
  "contact_submit_started",
  "contact_validation_failed",
  "booking_hold_failed",
  "booking_confirm_failed",
  "booking_confirmed",
]);

type BookingFunnelEventName =
  | "booking_started"
  | "category_selected"
  | "subcategory_selected"
  | "service_selected"
  | "employee_selected"
  | "slot_selected"
  | "contact_submit_started"
  | "contact_validation_failed"
  | "booking_hold_failed"
  | "booking_confirm_failed"
  | "booking_confirmed";

interface RecordBookingFunnelEventInput {
  business_id?: string;
  event_name?: BookingFunnelEventName;
  session_id?: string;
  surface?: string;
  path?: string;
  category?: string | null;
  subcategory?: string | null;
  service_id?: string | null;
  employee_id?: string | null;
  slot_at?: string | null;
  error_code?: string | null;
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function ensureAllowedEvent(value: unknown): BookingFunnelEventName {
  if (typeof value !== "string" || !ALLOWED_EVENTS.has(value)) {
    throw new HttpsError("invalid-argument", "Unsupported booking funnel event");
  }
  return value as BookingFunnelEventName;
}

export const recordBookingFunnelEvent = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<RecordBookingFunnelEventInput>) => {
    const db = getFirestore();
    const businessId = cleanString(request.data?.business_id, 120);
    const sessionId = cleanString(request.data?.session_id, 160);
    const surface = cleanString(request.data?.surface, 64) ?? "public_booking";
    const path = cleanString(request.data?.path, 160) ?? "/booking";
    const eventName = ensureAllowedEvent(request.data?.event_name);

    if (!businessId || !sessionId) {
      throw new HttpsError("invalid-argument", "business_id and session_id are required");
    }

    const businessSnap = await db.collection("businesses").doc(businessId).get();
    if (!businessSnap.exists) {
      throw new HttpsError("not-found", "Business not found");
    }

    const nowIso = new Date().toISOString();
    const payload = {
      business_id: businessId,
      event_name: eventName,
      session_id: sessionId,
      surface,
      path,
      category: cleanString(request.data?.category, 32),
      subcategory: cleanString(request.data?.subcategory, 120),
      service_id: cleanString(request.data?.service_id, 120),
      employee_id: cleanString(request.data?.employee_id, 120),
      slot_at: cleanString(request.data?.slot_at, 64),
      error_code: cleanString(request.data?.error_code, 120),
      actor_uid: request.auth?.uid ?? null,
      origin: cleanString(request.rawRequest.headers.origin, 160),
      user_agent: cleanString(request.rawRequest.headers["user-agent"], 255),
      created_at: nowIso,
    };

    const healthUpdate: Record<string, unknown> = {
      kind: "booking_funnel",
      business_id: businessId,
      updated_at: nowIso,
      last_event_name: eventName,
      last_event_at: nowIso,
      last_session_id: sessionId,
      last_surface: surface,
      total_events: FieldValue.increment(1),
      [`counters.${eventName}`]: FieldValue.increment(1),
    };

    if (payload.category) {
      healthUpdate[`category_counters.${payload.category}`] = FieldValue.increment(1);
    }

    await Promise.all([
      db.collection("booking_funnel_events").add(payload),
      db.collection("ops_health").doc(`booking_funnel_${businessId}`).set(healthUpdate, { merge: true }),
    ]);

    return { success: true };
  },
);
