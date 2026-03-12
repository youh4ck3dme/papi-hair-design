import { functions } from "./config";
import { httpsCallable } from "firebase/functions";

export interface LookupBookingHistoryBody {
  access_token?: string;
  reference?: string;
  email?: string;
  phone?: string;
}

export interface BookingHistoryItem {
  id: string;
  service_name?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status?: string | null;
  service_price?: number | null;
  is_reference?: boolean;
}

export interface LookupBookingHistoryResponse {
  success?: boolean;
  customer_email?: string | null;
  customer_phone?: string | null;
  reference?: string | null;
  appointments?: BookingHistoryItem[];
}

export async function lookupBookingHistory(
  body: LookupBookingHistoryBody
): Promise<LookupBookingHistoryResponse> {
  const fn = httpsCallable<LookupBookingHistoryBody, LookupBookingHistoryResponse>(
    functions,
    "lookupBookingHistory"
  );
  const result = await fn(body);
  return result.data;
}
