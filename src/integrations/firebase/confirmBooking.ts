import { functions } from "./config";
import { httpsCallable } from "firebase/functions";
import { toCallableErrorMessage } from "./callableError";

export interface ConfirmBookingBody {
  appointment_id: string;
  confirm_token: string;
  idempotency_key?: string;
  recaptcha_token?: string | null;
}

export interface ConfirmBookingResponse {
  success?: boolean;
  error?: string;
  appointment_id?: string;
  status?: string;
  claim_token?: string | null;
  history_access_token?: string | null;
  history_reference?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
}

export async function confirmBooking(
  body: ConfirmBookingBody
): Promise<ConfirmBookingResponse> {
  try {
    const fn = httpsCallable<ConfirmBookingBody, ConfirmBookingResponse>(
      functions,
      "confirmBooking"
    );
    const result = await fn(body);
    return result.data;
  } catch (err: any) {
    console.error("confirmBooking error:", err);
    return { error: toCallableErrorMessage(err, "Chyba pri potvrdení rezervácie") };
  }
}
