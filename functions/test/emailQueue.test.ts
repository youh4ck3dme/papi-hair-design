import { beforeEach, describe, expect, it, vi } from "vitest";
import { queueAdminBookingNotificationEmail, queueCustomerBookingEmail } from "../src/emailQueue";

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
  });

  it("sends booking email via SMTP when smtp_config is present", async () => {
    const result = await queueCustomerBookingEmail({
      businessId: "biz-1",
      appointmentId: "apt-1",
      customerEmail: "client@example.com",
      customerName: "Klient",
      serviceName: "Strih",
      startAtIso: "2026-04-01T10:00:00.000Z",
      historyAccessUrl: "https://example.com/history",
    });

    expect(result).toEqual({ queued: true });
    expect(state.readSecret).toHaveBeenCalledWith("projects/demo/secrets/smtp-password-biz-1");
    expect(state.sendMail).toHaveBeenCalledTimes(1);
    expect(state.addedDocs).toHaveLength(0);
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
      historyAccessUrl: null,
    });

    expect(result).toEqual({ queued: true });
    expect(state.sendMail).not.toHaveBeenCalled();
    expect(state.addedDocs).toHaveLength(1);
    expect(state.addedDocs[0]?.path).toBe("mail");
    expect(state.addedDocs[0]?.payload?.metadata?.fallback_reason).toBe("smtp_not_configured");
  });

  it("returns missing_admin_notification_email for admin notification when env is absent", async () => {
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
      queued: false,
      reason: "missing_admin_notification_email",
    });
  });
});
