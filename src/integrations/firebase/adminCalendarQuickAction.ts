import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export type AdminCalendarQuickActionType = "move" | "duplicate" | "block" | "delete_block";
export type AdminCalendarEventType = "appointment" | "time_block";

export interface AdminCalendarQuickActionBody {
  business_id: string;
  action: AdminCalendarQuickActionType;
  event_type?: AdminCalendarEventType;
  appointment_id?: string;
  time_block_id?: string;
  employee_id?: string;
  start_at?: string;
  end_at?: string;
  reason?: string;
}

interface AdminCalendarQuickActionResponse {
  success: boolean;
  event_type?: AdminCalendarEventType;
  event_id?: string;
  start_at?: string;
  end_at?: string;
}

export async function adminCalendarQuickAction(body: AdminCalendarQuickActionBody) {
  const callable = httpsCallable<
    AdminCalendarQuickActionBody,
    AdminCalendarQuickActionResponse
  >(functions, "adminCalendarQuickAction");
  const result = await callable(body);
  return result.data;
}
