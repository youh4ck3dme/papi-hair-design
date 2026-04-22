import { describe, expect, it } from "vitest";
import {
  buildBookingCalendarInvite,
  buildCalendarInviteDownloadUrl,
  buildCustomerCalendarLinks,
  buildGoogleCalendarUrl,
  buildIcsContent,
  extractHistoryAccessParams,
} from "../src/calendarInvite";

describe("calendarInvite helpers", () => {
  it("extracts history access params from history URL", () => {
    expect(
      extractHistoryAccessParams("https://booking.papihairdesign.sk/dashboard/history?ref=apt-1&access=secret-token")
    ).toEqual({
      reference: "apt-1",
      accessToken: "secret-token",
    });
  });

  it("builds customer calendar links from booking confirmation data", () => {
    const links = buildCustomerCalendarLinks({
      appointmentId: "apt-1",
      businessName: "PAPI Hair Design",
      businessAddress: "Hlavná 1, Košice",
      serviceName: "Dámsky strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: "2026-04-01T11:00:00.000Z",
      historyAccessUrl: "https://booking.papihairdesign.sk/dashboard/history?ref=apt-1&access=secret-token",
    });

    expect(links.googleUrl).toBe(
      buildGoogleCalendarUrl({
        title: "PAPI Hair Design - Dámsky strih",
        description: "Potvrdená rezervácia služby Dámsky strih v salóne PAPI Hair Design.",
        location: "Hlavná 1, Košice",
        start: new Date("2026-04-01T10:00:00.000Z"),
        end: new Date("2026-04-01T11:00:00.000Z"),
      })
    );
    expect(links.icsUrl).toBe(buildCalendarInviteDownloadUrl("apt-1", "secret-token"));
  });

  it("omits calendar links when booking time range is incomplete", () => {
    const links = buildCustomerCalendarLinks({
      appointmentId: "apt-1",
      businessName: "PAPI Hair Design",
      businessAddress: "Hlavná 1, Košice",
      serviceName: "Dámsky strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: null,
      historyAccessUrl: "https://booking.papihairdesign.sk/dashboard/history?ref=apt-1&access=secret-token",
    });

    expect(links).toEqual({
      googleUrl: null,
      icsUrl: null,
    });
  });

  it("builds ICS payload with stable branding and UID", () => {
    const invite = buildBookingCalendarInvite({
      appointmentId: "apt-42",
      businessName: "PAPI Hair Design",
      businessAddress: "Hlavná 1, Košice",
      serviceName: "Balayage komplet",
      startAtIso: "2026-04-02T12:00:00.000Z",
      endAtIso: "2026-04-02T15:00:00.000Z",
    });

    expect(invite).toBeTruthy();
    const ics = buildIcsContent({
      ...invite!,
      stamp: new Date("2026-04-01T09:00:00.000Z"),
    });

    expect(ics).toContain("PRODID:-//PAPI HAIR DESIGN//Booking//SK");
    expect(ics).toContain("UID:booking-apt-42@papihairdesign.sk");
    expect(ics).toContain("SUMMARY:PAPI Hair Design - Balayage komplet");
    expect(ics).toContain("LOCATION:Hlavná 1\\, Košice");
    expect(ics).toContain("DTSTART:20260402T120000Z");
    expect(ics).toContain("DTEND:20260402T150000Z");
  });
});
