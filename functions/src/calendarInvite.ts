import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import {
  isAppointmentVisibleToHistoryContext,
  resolveHistoryContext,
  type HistoryVisibleAppointment,
} from "./bookingHistoryAccess";
import { APP_BRAND_NAME, APP_ICS_DOMAIN } from "./brandConfig";
import { resolvePublicBookingBaseUrl } from "./publicBookingAccess";

export interface CalendarExportInput {
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  uid?: string | null;
  stamp?: Date | null;
}

interface BookingCalendarInviteInput {
  appointmentId: string;
  businessName: string;
  serviceName: string | null;
  startAtIso: string;
  endAtIso: string | null | undefined;
  businessAddress?: string | null;
}

type HistoryAccessParams = {
  reference: string;
  accessToken: string;
};

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function toUtcCalendarStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildGoogleCalendarUrl(input: CalendarExportInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toUtcCalendarStamp(input.start)}/${toUtcCalendarStamp(input.end)}`,
  });

  if (input.description) {
    params.set("details", input.description);
  }

  if (input.location) {
    params.set("location", input.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent(input: CalendarExportInput): string {
  const now = input.stamp ?? new Date();
  const uid = input.uid?.trim() || `booking-${input.start.getTime()}@${APP_ICS_DOMAIN}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${APP_BRAND_NAME}//Booking//SK`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${toUtcCalendarStamp(now)}`,
    `DTSTART:${toUtcCalendarStamp(input.start)}`,
    `DTEND:${toUtcCalendarStamp(input.end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description ?? "")}`,
    `LOCATION:${escapeIcs(input.location ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function extractHistoryAccessParams(historyAccessUrl: string | null | undefined): HistoryAccessParams | null {
  if (!historyAccessUrl) return null;

  try {
    const url = new URL(historyAccessUrl);
    const reference = url.searchParams.get("ref")?.trim() ?? "";
    const accessToken = url.searchParams.get("access")?.trim() ?? "";

    if (!reference || !accessToken) {
      return null;
    }

    return { reference, accessToken };
  } catch {
    return null;
  }
}

export function buildCalendarInviteDownloadUrl(reference: string, accessToken: string): string {
  const params = new URLSearchParams({
    ref: reference,
    access: accessToken,
  });

  return `${resolvePublicBookingBaseUrl()}/calendar/invite.ics?${params.toString()}`;
}

export function buildBookingCalendarInvite(input: BookingCalendarInviteInput): CalendarExportInput | null {
  const start = parseIsoDate(input.startAtIso);
  const end = parseIsoDate(input.endAtIso);

  if (!start || !end || end <= start) {
    return null;
  }

  const businessName = input.businessName.trim() || APP_BRAND_NAME;
  const serviceName = input.serviceName?.trim() || "Rezervácia";

  return {
    title: `${businessName} - ${serviceName}`,
    description: `Potvrdená rezervácia služby ${serviceName} v salóne ${businessName}.`,
    location: input.businessAddress?.trim() || null,
    start,
    end,
    uid: `booking-${input.appointmentId}@${APP_ICS_DOMAIN}`,
  };
}

export function buildCustomerCalendarLinks(input: BookingCalendarInviteInput & { historyAccessUrl?: string | null }): {
  googleUrl: string | null;
  icsUrl: string | null;
} {
  const invite = buildBookingCalendarInvite(input);
  if (!invite) {
    return { googleUrl: null, icsUrl: null };
  }

  const googleUrl = buildGoogleCalendarUrl(invite);
  const historyAccess = extractHistoryAccessParams(input.historyAccessUrl);
  const icsUrl = historyAccess
    ? buildCalendarInviteDownloadUrl(historyAccess.reference, historyAccess.accessToken)
    : null;

  return { googleUrl, icsUrl };
}

export const downloadBookingIcs = onRequest({ region: "europe-west1" }, async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const accessToken = typeof req.query.access === "string" ? req.query.access.trim() : "";
  const requestedReference = typeof req.query.ref === "string" ? req.query.ref.trim() : "";

  if (!accessToken) {
    res.status(400).send("Missing access token");
    return;
  }

  try {
    const context = await resolveHistoryContext({ access_token: accessToken });
    const reference = requestedReference || context.reference;
    if (!reference || reference !== context.reference) {
      res.status(403).send("Invalid booking reference");
      return;
    }

    const db = getFirestore();
    const [appointmentSnap, businessSnap] = await Promise.all([
      db.collection("appointments").doc(reference).get(),
      db.collection("businesses").doc(context.businessId).get(),
    ]);

    if (!appointmentSnap.exists) {
      res.status(404).send("Booking not found");
      return;
    }

    if (!businessSnap.exists) {
      res.status(404).send("Business not found");
      return;
    }

    const appointment = appointmentSnap.data() as HistoryVisibleAppointment & {
      start_at?: string | null;
      end_at?: string | null;
      service_name?: string | null;
      business_id?: string | null;
    };

    if (!isAppointmentVisibleToHistoryContext(appointment, context)) {
      res.status(403).send("Booking access denied");
      return;
    }

    const business = businessSnap.data() as { name?: string | null; address?: string | null };
    const invite = buildBookingCalendarInvite({
      appointmentId: reference,
      businessName: business.name?.trim() || APP_BRAND_NAME,
      businessAddress: business.address ?? null,
      serviceName: appointment.service_name ?? null,
      startAtIso: appointment.start_at ?? "",
      endAtIso: appointment.end_at ?? null,
    });

    if (!invite) {
      res.status(422).send("Booking calendar data is incomplete");
      return;
    }

    const filenameBase = slugifySegment(`${business.name ?? "papi-hair-design"}-${appointment.service_name ?? "booking"}`) || "papi-hair-design-booking";
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.ics"`);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.status(200).send(buildIcsContent(invite));
  } catch {
    res.status(403).send("Invalid or expired booking access");
  }
});
