import { describe, expect, it } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import {
  MAX_RECURRING_BLOCK_OCCURRENCES,
  buildTimeBlockOccurrences,
} from "../src/timeBlockRecurrence";

describe("buildTimeBlockOccurrences", () => {
  it("returns a single occurrence when repeat is disabled", () => {
    const occurrences = buildTimeBlockOccurrences({
      startAt: "2026-01-15T08:00:00.000Z",
      endAt: "2026-01-15T08:30:00.000Z",
      timezone: "Europe/Bratislava",
    });

    expect(occurrences).toEqual([
      {
        occurrenceIndex: 0,
        startAt: "2026-01-15T08:00:00.000Z",
        endAt: "2026-01-15T08:30:00.000Z",
      },
    ]);
  });

  it("keeps wall-clock time stable across DST when repeating daily", () => {
    const occurrences = buildTimeBlockOccurrences({
      startAt: "2026-03-28T08:00:00.000Z",
      endAt: "2026-03-28T08:30:00.000Z",
      timezone: "Europe/Bratislava",
      repeat: true,
      repeatFrequency: "daily",
      repeatUntilDate: "2026-03-30",
    });

    expect(occurrences.map((occurrence) => occurrence.startAt)).toEqual([
      "2026-03-28T08:00:00.000Z",
      "2026-03-29T07:00:00.000Z",
      "2026-03-30T07:00:00.000Z",
    ]);
  });

  it("generates monthly all-day style ranges without losing the day boundary", () => {
    const occurrences = buildTimeBlockOccurrences({
      startAt: "2026-01-31T23:00:00.000Z",
      endAt: "2026-02-01T23:00:00.000Z",
      timezone: "Europe/Bratislava",
      repeat: true,
      repeatFrequency: "monthly",
      repeatUntilDate: "2026-03-31",
    });

    expect(occurrences).toHaveLength(2);
    expect(occurrences[0]?.startAt).toBe("2026-01-31T23:00:00.000Z");
    expect(occurrences[1]?.startAt).toBe("2026-02-28T23:00:00.000Z");
  });

  it("rejects overlapping generated occurrences", () => {
    expect(() =>
      buildTimeBlockOccurrences({
        startAt: "2026-01-15T08:00:00.000Z",
        endAt: "2026-01-15T10:00:00.000Z",
        timezone: "Europe/Bratislava",
        repeat: true,
        repeatFrequency: "hourly",
        repeatUntilDate: "2026-01-15",
      }),
    ).toThrowError(HttpsError);
  });

  it("caps overly large recurrence series", () => {
    expect(() =>
      buildTimeBlockOccurrences({
        startAt: "2026-01-01T08:00:00.000Z",
        endAt: "2026-01-01T08:30:00.000Z",
        timezone: "Europe/Bratislava",
        repeat: true,
        repeatFrequency: "hourly",
        repeatUntilDate: "2026-01-20",
      }),
    ).toThrowError(
      new RegExp(`maximum of ${MAX_RECURRING_BLOCK_OCCURRENCES} occurrences`, "i"),
    );
  });
});
