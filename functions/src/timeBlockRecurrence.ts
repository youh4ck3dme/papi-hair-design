import { DateTime } from "luxon";
import { HttpsError } from "firebase-functions/v2/https";

export const DEFAULT_RECURRENCE_TIMEZONE = "Europe/Bratislava";
export const MAX_RECURRING_BLOCK_OCCURRENCES = 240;

export type TimeBlockRepeatFrequency =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export interface BuildTimeBlockOccurrencesInput {
  startAt: string;
  endAt: string;
  timezone?: string;
  repeat?: boolean;
  repeatFrequency?: TimeBlockRepeatFrequency;
  repeatUntilDate?: string;
  repeatInterval?: number;
}

export interface TimeBlockOccurrence {
  occurrenceIndex: number;
  startAt: string;
  endAt: string;
}

function parseUtcIso(value: string): DateTime {
  const parsed = DateTime.fromISO(value, { setZone: true });
  if (!parsed.isValid) {
    throw new HttpsError("invalid-argument", `Invalid datetime value: ${value}`);
  }

  return parsed.toUTC();
}

function parseUntilBoundary(dateValue: string, timezone: string): DateTime {
  const parsed = DateTime.fromISO(dateValue, { zone: timezone });
  if (!parsed.isValid) {
    throw new HttpsError("invalid-argument", `Invalid recurrence end date: ${dateValue}`);
  }

  return parsed.endOf("day");
}

function advanceOccurrence(
  start: DateTime,
  end: DateTime,
  frequency: TimeBlockRepeatFrequency,
  interval: number,
): { start: DateTime; end: DateTime } {
  switch (frequency) {
    case "hourly":
      return {
        start: start.plus({ hours: interval }),
        end: end.plus({ hours: interval }),
      };
    case "daily":
      return {
        start: start.plus({ days: interval }),
        end: end.plus({ days: interval }),
      };
    case "weekly":
      return {
        start: start.plus({ weeks: interval }),
        end: end.plus({ weeks: interval }),
      };
    case "monthly":
      return {
        start: start.plus({ months: interval }),
        end: end.plus({ months: interval }),
      };
    case "yearly":
      return {
        start: start.plus({ years: interval }),
        end: end.plus({ years: interval }),
      };
    default:
      throw new HttpsError("invalid-argument", `Unsupported recurrence frequency: ${String(frequency)}`);
  }
}

function toUtcIso(value: DateTime, label: string): string {
  const iso = value.toUTC().toISO();
  if (!iso) {
    throw new HttpsError("internal", `Unable to serialize ${label}`);
  }

  return iso;
}

export function buildTimeBlockOccurrences(
  input: BuildTimeBlockOccurrencesInput,
): TimeBlockOccurrence[] {
  const timezone =
    typeof input.timezone === "string" && input.timezone.trim().length > 0
      ? input.timezone.trim()
      : DEFAULT_RECURRENCE_TIMEZONE;

  const startUtc = parseUtcIso(input.startAt);
  const endUtc = parseUtcIso(input.endAt);
  if (endUtc <= startUtc) {
    throw new HttpsError("invalid-argument", "End must be later than start");
  }

  const localStart = startUtc.setZone(timezone);
  const localEnd = endUtc.setZone(timezone);

  if (!input.repeat) {
    return [
      {
        occurrenceIndex: 0,
        startAt: toUtcIso(localStart, "occurrence start"),
        endAt: toUtcIso(localEnd, "occurrence end"),
      },
    ];
  }

  if (!input.repeatFrequency) {
    throw new HttpsError("invalid-argument", "Missing recurrence frequency");
  }
  if (!input.repeatUntilDate) {
    throw new HttpsError("invalid-argument", "Missing recurrence end date");
  }

  const repeatInterval = Math.max(1, Math.floor(Number(input.repeatInterval ?? 1)));
  const untilBoundary = parseUntilBoundary(input.repeatUntilDate, timezone);
  if (localStart > untilBoundary) {
    throw new HttpsError("invalid-argument", "Recurrence end date must not be earlier than the first occurrence");
  }

  const occurrences: TimeBlockOccurrence[] = [];
  let currentStart = localStart;
  let currentEnd = localEnd;
  let occurrenceIndex = 0;

  while (currentStart <= untilBoundary) {
    if (occurrences.length >= MAX_RECURRING_BLOCK_OCCURRENCES) {
      throw new HttpsError(
        "invalid-argument",
        `Recurring block exceeds the maximum of ${MAX_RECURRING_BLOCK_OCCURRENCES} occurrences`,
      );
    }

    occurrences.push({
      occurrenceIndex,
      startAt: toUtcIso(currentStart, "occurrence start"),
      endAt: toUtcIso(currentEnd, "occurrence end"),
    });

    const next = advanceOccurrence(currentStart, currentEnd, input.repeatFrequency, repeatInterval);
    if (next.start < currentEnd) {
      throw new HttpsError("invalid-argument", "Recurring block occurrences must not overlap");
    }

    currentStart = next.start;
    currentEnd = next.end;
    occurrenceIndex += 1;
  }

  return occurrences;
}
