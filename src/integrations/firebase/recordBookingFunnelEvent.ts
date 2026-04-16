import * as Sentry from "@sentry/react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/integrations/firebase/config";

export type BookingFunnelEventName =
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

interface BookingFunnelEventInput {
  business_id: string;
  event_name: BookingFunnelEventName;
  surface?: string;
  path?: string;
  category?: string | null;
  subcategory?: string | null;
  service_id?: string | null;
  employee_id?: string | null;
  slot_at?: string | null;
  error_code?: string | null;
  dedupe_key?: string;
}

const SESSION_STORAGE_KEY = "booking_funnel_session_id";
const sentEventKeys = new Set<string>();

function ensureSessionId(): string {
  if (typeof window === "undefined") return "server-session";

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

export async function recordBookingFunnelEvent({
  dedupe_key,
  path,
  surface,
  ...input
}: BookingFunnelEventInput): Promise<void> {
  const sessionId = ensureSessionId();
  const dedupeKey = dedupe_key?.trim();
  if (dedupeKey && sentEventKeys.has(dedupeKey)) {
    return;
  }

  if (dedupeKey) {
    sentEventKeys.add(dedupeKey);
  }

  Sentry.addBreadcrumb({
    category: "booking_funnel",
    level: "info",
    message: input.event_name,
    data: {
      business_id: input.business_id,
      category: input.category,
      subcategory: input.subcategory,
      service_id: input.service_id,
      employee_id: input.employee_id,
      slot_at: input.slot_at,
    },
  });

  if (import.meta.env.DEV) {
    return;
  }

  try {
    const callable = httpsCallable(functions, "recordBookingFunnelEvent");
    await callable({
      ...input,
      session_id: sessionId,
      path:
        path ??
        (typeof window !== "undefined" ? window.location.pathname : "/booking"),
      surface: surface ?? "public_booking",
    });
  } catch (error) {
    console.info("recordBookingFunnelEvent: skipped", error);
  }
}
