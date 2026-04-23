import { APP_BRAND_NAME, APP_BRAND_SLUG, APP_ICS_DOMAIN } from "@/lib/brandConfig";

export interface CalendarExportInput {
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  uid?: string | null;
  stamp?: Date | null;
}

interface BookingCalendarExportInput {
  appointmentId?: string | null;
  businessName: string;
  serviceName?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
}

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

export function buildBookingIcsDownloadUrl(reference: string, accessToken: string): string {
  const params = new URLSearchParams({
    ref: reference,
    access: accessToken,
  });

  return `/calendar/invite.ics?${params.toString()}`;
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
    `UID:${uid}`,
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

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildBookingCalendarExport(input: BookingCalendarExportInput): CalendarExportInput {
  const businessName = input.businessName.trim() || APP_BRAND_NAME;
  const serviceName = input.serviceName?.trim() || "Rezervácia";

  return {
    title: `${businessName} - ${serviceName}`,
    description: `Potvrdená rezervácia služby ${serviceName} v salóne ${businessName}.`,
    location: input.location?.trim() || null,
    start: input.start,
    end: input.end,
    uid: input.appointmentId?.trim() ? `booking-${input.appointmentId.trim()}@${APP_ICS_DOMAIN}` : null,
  };
}

export function buildBookingIcsFilename(serviceName?: string | null): string {
  const serviceSegment = slugifySegment(serviceName?.trim() || "booking");
  return `${APP_BRAND_SLUG}-${serviceSegment || "booking"}.ics`;
}
