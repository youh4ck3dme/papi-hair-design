import { functions } from "./config";
import { httpsCallable } from "firebase/functions";

export interface CreateBookingHoldBody {
  business_id: string;
  service_id: string;
  employee_id: string;
  start_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  idempotency_key?: string;
}

export interface CreateBookingHoldResponse {
  success?: boolean;
  error?: string;
  appointment_id?: string;
  hold_expires_at?: string;
  idempotency_key?: string;
  reused?: boolean;
}

export async function createBookingHold(
  body: CreateBookingHoldBody
): Promise<CreateBookingHoldResponse> {
  try {
    const fn = httpsCallable<
      CreateBookingHoldBody,
      CreateBookingHoldResponse
    >(functions, "createBookingHold");
    const result = await fn(body);
    return result.data;
  } catch (err: any) {
    console.error("createBookingHold error:", err);
    return { error: err.message || "Chyba pri vytváraní rezervácie" };
  }
}
