import type { BookingCalendarEvent } from "./calendar-types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function normalizeCalendarSearchQuery(value: string): string {
  return normalize(value);
}

function getResourceValue(
  resource: unknown,
  key: string,
): string {
  if (!resource || typeof resource !== "object") return "";
  const value = (resource as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function buildCalendarSearchHaystack(
  event: BookingCalendarEvent,
): string {
  const searchable = [
    event.id,
    event.title,
    getResourceValue(event.resource, "customer_name"),
    getResourceValue(event.resource, "customer_email"),
    getResourceValue(event.resource, "customer_phone"),
    getResourceValue(event.resource, "service_name"),
    getResourceValue(event.resource, "employee_name"),
    getResourceValue(event.resource, "reference"),
    getResourceValue(event.resource, "note"),
  ]
    .map(normalize)
    .filter(Boolean);

  return searchable.join(" ");
}

export function buildCalendarSearchIndex(
  events: BookingCalendarEvent[],
): Map<string, string> {
  const index = new Map<string, string>();
  for (const event of events) {
    index.set(event.id, buildCalendarSearchHaystack(event));
  }
  return index;
}

export function matchesCalendarSearch(
  event: BookingCalendarEvent,
  query: string,
): boolean {
  const normalizedQuery = normalizeCalendarSearchQuery(query);
  if (!normalizedQuery) return true;
  const haystack = buildCalendarSearchHaystack(event);
  return haystack.includes(normalizedQuery);
}
