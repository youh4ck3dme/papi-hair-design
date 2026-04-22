import { describe, expect, it } from "vitest";
import {
  buildBookingCalendarExport,
  buildBookingIcsFilename,
  buildGoogleCalendarUrl,
  buildIcsContent,
} from "./calendarExport";

describe("calendarExport", () => {
  const start = new Date("2026-03-12T09:00:00.000Z");
  const end = new Date("2026-03-12T10:00:00.000Z");

  it("builds a google calendar deep link", () => {
    const url = buildGoogleCalendarUrl({
      title: "PAPI HAIR DESIGN - Konzultácia",
      location: "Tr. SNP 61A, Košice",
      start,
      end,
    });

    expect(url).toContain("calendar.google.com");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("PAPI+HAIR+DESIGN");
  });

  it("builds an ICS payload", () => {
    const ics = buildIcsContent({
      title: "PAPI Hair Design - Konzultácia",
      description: "Rezervovaný termín",
      location: "Tr. SNP 61A, Košice",
      start,
      end,
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:PAPI Hair Design - Konzultácia");
    expect(ics).toContain("LOCATION:Tr. SNP 61A\\, Košice");
  });

  it("builds booking export payload aligned with email wording", () => {
    expect(
      buildBookingCalendarExport({
        appointmentId: "apt-1",
        businessName: "PAPI Hair Design",
        serviceName: "Balayage komplet",
        location: "Tr. SNP 61A, Košice",
        start,
        end,
      })
    ).toEqual({
      title: "PAPI Hair Design - Balayage komplet",
      description: "Potvrdená rezervácia služby Balayage komplet v salóne PAPI Hair Design.",
      location: "Tr. SNP 61A, Košice",
      start,
      end,
      uid: "booking-apt-1@papihairdesign.sk",
    });
  });

  it("builds booking ICS filename from service name", () => {
    expect(buildBookingIcsFilename("Balayage komplet")).toBe("papi-hair-design-balayage-komplet.ics");
  });
});
