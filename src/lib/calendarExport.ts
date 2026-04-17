export interface CalendarExportInput {
  title: string;
  description?: string | null;
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

export function buildIcsContent(input: CalendarExportInput): string {
  const now = new Date();
  const uid = `booking-${input.start.getTime()}@papihairdesign.sk`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PAPI HAIR DESIGN//Booking//SK",
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
