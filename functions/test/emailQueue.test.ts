import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGoogleCalendarUrl } from "../src/calendarInvite";
import {
  queueAdminBookingNotificationEmail,
  queueAdminCustomerCancellationEmail,
  queueCustomerBookingEmail,
  queueCustomerCancellationEmail,
  queueRegistrationWelcomeEmail,
} from "../src/emailQueue";

const state = vi.hoisted(() => ({
  business: {
    timezone: "Europe/Bratislava",
    name: "PAPI Hair Design",
    smtp_config: {
      host: "smtp.example.com",
      port: 465,
      user: "booking@example.com",
      from: "booking@example.com",
      password_secret: "projects/demo/secrets/smtp-password-biz-1",
    },
  } as Record<string, any>,
  addedDocs: [] as Array<{ path: string; payload: Record<string, any> }>,
  sendMail: vi.fn(),
  readSecret: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (path: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists: true,
          data: () => (path === "businesses" && id === "biz-1" ? state.business : null),
        }),
      }),
      add: async (payload: Record<string, any>) => {
        state.addedDocs.push({ path, payload });
        return { id: "mail-doc-1" };
      },
    }),
  }),
}));

vi.mock("../src/secretManager", () => ({
  readSecret: (...args: any[]) => state.readSecret(...args),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: (...args: any[]) => state.sendMail(...args),
    }),
  },
}));

describe("emailQueue SMTP routing", () => {
  beforeEach(() => {
    state.addedDocs = [];
    state.sendMail.mockReset();
    state.readSecret.mockReset();
    state.readSecret.mockResolvedValue("smtp-pass");
    state.sendMail.mockResolvedValue({ messageId: "msg-1" });
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
    process.env.PUBLIC_BOOKING_BASE_URL = "https://booking.papihairdesign.sk";
    state.business = {
      timezone: "Europe/Bratislava",
      name: "PAPI Hair Design",
      address: "Hlavná 1, Košice",
      email: "salon@example.com",
      phone: "+421 905 123 456",
      smtp_config: {
        host: "smtp.example.com",
        port: 465,
        user: "booking@example.com",
        from: "booking@example.com",
        password_secret: "projects/demo/secrets/smtp-password-biz-1",
      },
    };
  });

  function getSentPayload(callIndex = 0) {
    const payload = state.sendMail.mock.calls[callIndex]?.[0] as
      | { html?: string; to?: string[]; subject?: string }
      | undefined;

    expect(payload).toBeDefined();
    expect(payload?.html).toBeTruthy();
    return payload!;
  }

  function expectHref(html: string, href: string, label?: string) {
    expect(html).toContain(`href="${href.replaceAll("&", "&amp;")}"`);
    if (label) {
      expect(html).toContain(label);
    }
  }

  it("sends booking email via SMTP when smtp_config is present", async () => {
    const result = await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-1",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: "2026-04-01T11:00:00.000Z",
      historyAccessUrl: "https://example.com/history",
    });

    expect(result).toEqual({ queued: true });
    expect(state.readSecret).toHaveBeenCalledWith("projects/demo/secrets/smtp-password-biz-1");
    expect(state.sendMail).toHaveBeenCalledTimes(1);
    expect(state.addedDocs).toHaveLength(0);
  });

  it("uses history access URL as primary CTA for customer booking emails", async () => {
    await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-history",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: "2026-04-01T11:00:00.000Z",
      historyAccessUrl: "https://booking.papihairdesign.sk/dashboard/history?ref=abc&access=def",
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/dashboard/history?ref=abc&access=def", "Moje rezervácie");
    expectHref(payload.html!, buildGoogleCalendarUrl({
      title: "PAPI Hair Design - Strih",
      description: "Potvrdená rezervácia služby Strih v salóne PAPI Hair Design.",
      location: "Hlavná 1, Košice",
      start: new Date("2026-04-01T10:00:00.000Z"),
      end: new Date("2026-04-01T11:00:00.000Z"),
    }), "Pridať do Google Kalendára");
    expectHref(
      payload.html!,
      "https://booking.papihairdesign.sk/calendar/invite.ics?ref=abc&access=def",
      "Stiahnuť do kalendára (.ics)"
    );
    expectHref(payload.html!, "tel:+421905123456", "Kontakt");
  });

  it("falls back customer booking primary CTA to booking URL when history access URL is missing", async () => {
    await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-booking-fallback",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: "2026-04-01T11:00:00.000Z",
      historyAccessUrl: null,
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/booking", "Rezervovať termín");
    expectHref(payload.html!, buildGoogleCalendarUrl({
      title: "PAPI Hair Design - Strih",
      description: "Potvrdená rezervácia služby Strih v salóne PAPI Hair Design.",
      location: "Hlavná 1, Košice",
      start: new Date("2026-04-01T10:00:00.000Z"),
      end: new Date("2026-04-01T11:00:00.000Z"),
    }), "Pridať do Google Kalendára");
    expect(payload.html!).not.toContain("Stiahnuť do kalendára (.ics)");
  });

  it("uses mailto contact CTA when phone is unavailable", async () => {
    state.business = {
      ...state.business,
      phone: null,
      email: "kontakt@papihairdesign.sk",
    };

    await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-contact-mail",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: "2026-04-01T11:00:00.000Z",
      historyAccessUrl: "https://booking.papihairdesign.sk/dashboard/history?ref=abc&access=def",
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "mailto:kontakt@papihairdesign.sk", "Kontakt");
  });

  it("falls back customer contact CTA to booking URL when phone and email are unavailable", async () => {
    state.business = {
      ...state.business,
      phone: null,
      email: null,
    };

    await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-contact-booking",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      endAtIso: "2026-04-01T11:00:00.000Z",
      historyAccessUrl: "https://booking.papihairdesign.sk/dashboard/history?ref=abc&access=def",
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/booking", "Kontakt");
  });

  it("falls back to mail collection when smtp_config is missing", async () => {
    state.business = {
      timezone: "Europe/Bratislava",
      name: "PAPI Hair Design",
      smtp_config: null,
    };

    const result = await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-2",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Color",
      startAtIso: "2026-04-01T11:00:00.000Z",
      endAtIso: "2026-04-01T12:30:00.000Z",
      historyAccessUrl: null,
    });

    expect(result).toEqual({ queued: true });
    expect(state.sendMail).not.toHaveBeenCalled();
    expect(state.addedDocs).toHaveLength(1);
    expect(state.addedDocs[0]?.path).toBe("mail");
    expect(state.addedDocs[0]?.payload?.metadata?.fallback_reason).toBe("smtp_not_configured");
  });

  it("falls back admin notification recipients to business email when env is absent", async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;

    const result = await queueAdminBookingNotificationEmail({
      businessId: "biz-1",
      appointmentId: "apt-3",
      customerName: "Klient",
      customerEmail: "client@example.com",
      customerPhone: "+421900000000",
      serviceName: "Styling",
      startAtIso: "2026-04-01T12:00:00.000Z",
    });

    expect(result).toEqual({
      queued: true,
    });
    const payload = getSentPayload();
    expect(payload.to).toEqual(["salon@example.com"]);
  });

  it("returns missing_admin_notification_email when env and business email are both unavailable", async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    state.business = {
      ...state.business,
      email: null,
    };

    const result = await queueAdminBookingNotificationEmail({
      businessId: "biz-1",
      appointmentId: "apt-3b",
      customerName: "Klient",
      customerEmail: "client@example.com",
      customerPhone: "+421900000000",
      serviceName: "Styling",
      startAtIso: "2026-04-01T12:00:00.000Z",
    });

    expect(result).toEqual({
      queued: false,
      reason: "missing_admin_notification_email",
    });
  });

  it("uses absolute admin CTA URLs for booking notifications", async () => {
    await queueAdminBookingNotificationEmail({
      businessId: "biz-1",
      appointmentId: "apt-admin-booking",
      customerName: "Klient",
      customerEmail: "client@example.com",
      customerPhone: "+421900000000",
      serviceName: "Styling",
      startAtIso: "2026-04-01T12:00:00.000Z",
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/admin/appointments", "Otvoriť rezervácie");
    expectHref(payload.html!, "https://booking.papihairdesign.sk/admin/calendar", "Kalendár");
  });

  it("uses booking and history CTAs correctly in customer cancellation emails", async () => {
    await queueCustomerCancellationEmail({
      businessId: "biz-1",
      appointmentId: "apt-customer-cancel",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      cancelledBy: "customer",
      historyAccessUrl: "https://booking.papihairdesign.sk/dashboard/history?ref=cancel&access=token",
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/booking", "Rezervovať nový termín");
    expectHref(payload.html!, "https://booking.papihairdesign.sk/dashboard/history?ref=cancel&access=token", "Moje rezervácie");
  });

  it("omits history CTA in customer cancellation emails when history access URL is missing", async () => {
    await queueCustomerCancellationEmail({
      businessId: "biz-1",
      appointmentId: "apt-customer-cancel-fallback",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      cancelledBy: "admin",
      historyAccessUrl: null,
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/booking", "Rezervovať nový termín");
    expect(payload.html!).not.toContain("Moje rezervácie");
  });

  it("uses absolute admin CTA URLs for admin cancellation emails", async () => {
    await queueAdminCustomerCancellationEmail({
      businessId: "biz-1",
      appointmentId: "apt-admin-cancel",
      customerName: "Klient",
      customerEmail: "client@example.com",
      customerPhone: "+421900000000",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      cancelledBy: "admin",
      historyAccessUrl: null,
    });

    const payload = getSentPayload();
    expectHref(payload.html!, "https://booking.papihairdesign.sk/admin/appointments", "Otvoriť rezervácie");
    expectHref(payload.html!, "https://booking.papihairdesign.sk/admin/calendar", "Kalendár");
  });

  it("uses customer and admin CTA URLs correctly in registration welcome emails", async () => {
    await queueRegistrationWelcomeEmail({
      businessId: "biz-1",
      customerEmail: "new@example.com",
      customerName: "Nový Klient",
    });

    const customerPayload = getSentPayload(0);
    expectHref(customerPayload.html!, "https://booking.papihairdesign.sk/booking", "Rezervovať termín");
    expectHref(customerPayload.html!, "https://booking.papihairdesign.sk/my-account", "Môj účet");

    const adminPayload = getSentPayload(1);
    expectHref(adminPayload.html!, "https://booking.papihairdesign.sk/admin/customers", "Otvoriť administráciu");
    expectHref(adminPayload.html!, "https://booking.papihairdesign.sk/admin/customers", "Zákazníci");
  });

  it("uses only absolute public and admin URLs in generated CTA HTML", async () => {
    await queueRegistrationWelcomeEmail({
      businessId: "biz-1",
      customerEmail: "new@example.com",
      customerName: "Nový Klient",
    });

    const payload = getSentPayload(0);
    expect(payload.html!).not.toContain('href="/');
    expect(payload.html!).not.toContain("href='/");
  });
});
