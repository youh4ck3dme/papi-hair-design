import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export interface CancelCustomerBookingBody {
  access_token?: string;
  reference?: string;
  email?: string;
  phone?: string;
  appointment_id: string;
}

export interface CancelCustomerBookingResponse {
  success: boolean;
  appointment_id: string;
  status: string;
}

export async function cancelCustomerBooking(
  body: CancelCustomerBookingBody
): Promise<CancelCustomerBookingResponse> {
  const fn = httpsCallable<CancelCustomerBookingBody, CancelCustomerBookingResponse>(
    functions,
    "cancelCustomerBooking"
  );
  const result = await fn(body);
  return result.data;
}
