export type BookingCalendarMode = "day" | "week" | "month";

export interface BookingCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Semantic status for event chip: pending, confirmed, cancelled, completed (theme-aware) */
  color: string;
  /** Original resource from Firestore (customer, service, employee, etc.) */
  resource?: unknown;
}

export const CALENDAR_MODES: BookingCalendarMode[] = ["day", "week", "month"];

/** 128px per hour in day/week grid */
export const PIXELS_PER_HOUR = 128;

export const CALENDAR_START_HOUR = 3;
export const CALENDAR_END_HOUR = 23;
export const HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, i) => CALENDAR_START_HOUR + i
);

/** Map appointment status to semantic color key (theme-aware, zlato/čierna) */
export const STATUS_TO_COLOR: Record<string, string> = {
  pending: "pending",
  confirmed: "confirmed",
  cancelled: "cancelled",
  completed: "completed",
  no_show: "cancelled",
};

export function statusToColor(status: string): string {
  return STATUS_TO_COLOR[status] ?? "pending";
}
