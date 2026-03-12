import { HttpsError } from "firebase-functions/v2/https";

export const ADMIN_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type AdminBookingStatus = (typeof ADMIN_BOOKING_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<AdminBookingStatus, AdminBookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function assertValidAdminStatus(status: string): asserts status is AdminBookingStatus {
  if (!ADMIN_BOOKING_STATUSES.includes(status as AdminBookingStatus)) {
    throw new HttpsError("invalid-argument", "Unsupported booking status");
  }
}

export function ensureAllowedAdminTransition(currentStatus: string, nextStatus: string): void {
  assertValidAdminStatus(currentStatus);
  assertValidAdminStatus(nextStatus);

  if (currentStatus === nextStatus) {
    return;
  }

  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new HttpsError("failed-precondition", "Booking status transition is not allowed");
  }
}

export function buildBookingStatusUpdate(status: AdminBookingStatus, nowIso: string): Record<string, string | null> {
  const update: Record<string, string | null> = {
    status,
    updated_at: nowIso,
  };

  if (status === "confirmed") update.confirmed_at = nowIso;
  if (status === "cancelled") update.cancelled_at = nowIso;
  if (status === "completed") update.completed_at = nowIso;
  if (status === "no_show") update.no_show_at = nowIso;

  return update;
}
