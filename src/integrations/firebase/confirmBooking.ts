import { functions } from "./config";
import { httpsCallable } from "firebase/functions";

export interface ConfirmBookingBody {
  appointment_id: string;
  idempotency_key?: string;
}

export interface ConfirmBookingResponse {
  success?: boolean;
  error?: string;
  appointment_id?: string;
  status?: string;
  claim_token?: string | null;
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
    return { error: err.message || "Chyba pri potvrdení rezervácie" };
  }
}
