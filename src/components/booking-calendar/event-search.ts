import type { BookingCalendarEvent } from "./calendar-types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getResourceValue(
  resource: unknown,
  key: string,
): string {
  if (!resource || typeof resource !== "object") return "";
  const value = (resource as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function matchesCalendarSearch(
  event: BookingCalendarEvent,
  query: string,
): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

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

  return searchable.some((item) => item.includes(normalizedQuery));
}
