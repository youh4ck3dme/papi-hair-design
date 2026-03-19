import { HttpsError } from "firebase-functions/v2/https";

export type BookingErrorCode =
  | "missing_fields"
  | "invalid_start_at"
  | "missing_recaptcha_token"
  | "recaptcha_unavailable"
  | "recaptcha_failed"
  | "recaptcha_low_score"
  | "service_not_found"
  | "slot_unavailable"
  | "appointment_not_found"
  | "invalid_confirm_token"
  | "hold_expired";

interface BookingErrorOptions {
  status: "invalid-argument" | "permission-denied" | "not-found" | "already-exists" | "failed-precondition" | "unavailable";
  code: BookingErrorCode;
  message: string;
}

export function throwBookingError({ status, code, message }: BookingErrorOptions): never {
  throw new HttpsError(status, message, { code });
}

