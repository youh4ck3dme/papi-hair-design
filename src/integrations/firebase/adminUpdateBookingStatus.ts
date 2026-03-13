import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export type AdminBookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

interface AdminUpdateBookingStatusBody {
  business_id: string;
  appointment_id: string;
  status: AdminBookingStatus;
}

interface AdminUpdateBookingStatusResponse {
  success: boolean;
  appointment_id: string;
  status: AdminBookingStatus;
}

export async function adminUpdateBookingStatus(body: AdminUpdateBookingStatusBody) {
  const callable = httpsCallable<AdminUpdateBookingStatusBody, AdminUpdateBookingStatusResponse>(
    functions,
    "adminUpdateBookingStatus"
  );

  const result = await callable(body);
  return result.data;
}
