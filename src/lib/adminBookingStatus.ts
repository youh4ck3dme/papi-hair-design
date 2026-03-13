export type AdminBookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export const ADMIN_BOOKING_STATUS_LABELS: Record<AdminBookingStatus, string> = {
  pending: "Čaká na potvrdenie",
  confirmed: "Potvrdená",
  cancelled: "Zrušená",
  completed: "Dokončená",
  no_show: "Nedostavil sa",
};

export const ADMIN_BOOKING_STATUS_BADGES: Record<AdminBookingStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  completed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  no_show: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export function canAdminConfirmBooking(status: string): status is "pending" {
  return status === "pending";
}

export function canAdminCompleteBooking(status: string): status is "confirmed" {
  return status === "confirmed";
}

export function canAdminMarkNoShow(status: string): status is "confirmed" {
  return status === "confirmed";
}

export function canAdminCancelBooking(status: string): status is "pending" | "confirmed" {
  return status === "pending" || status === "confirmed";
}
