import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl, buildIcsContent } from "./calendarExport";

describe("calendarExport", () => {
  const start = new Date("2026-03-12T09:00:00.000Z");
  const end = new Date("2026-03-12T10:00:00.000Z");

  it("builds a google calendar deep link", () => {
    const url = buildGoogleCalendarUrl({
      title: "FYZIO&FIT - Konzultácia",
      location: "Trieda SNP 61, Košice",
      start,
      end,
    });

    expect(url).toContain("calendar.google.com");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("FYZIO%26FIT");
  });

  it("builds an ICS payload", () => {
    const ics = buildIcsContent({
      title: "FYZIO&FIT - Konzultácia",
      description: "Rezervovaný termín",
      location: "Trieda SNP 61, Košice",
      start,
      end,
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:FYZIO&FIT - Konzultácia");
    expect(ics).toContain("LOCATION:Trieda SNP 61\\, Košice");
  });
});
