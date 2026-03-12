import { getFirestore } from "firebase-admin/firestore";

interface QueueBookingEmailInput {
  businessId: string;
  appointmentId: string;
  customerEmail: string;
  customerName: string | null;
  serviceName: string | null;
  startAtIso: string;
  historyAccessUrl?: string | null;
}

interface QueueCancellationEmailInput {
  businessId: string;
  appointmentId: string;
  customerEmail: string;
  customerName: string | null;
  serviceName: string | null;
  startAtIso: string;
  cancelledBy: "admin" | "customer";
}

interface QueueAdminNotificationInput {
  businessId: string;
  appointmentId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string | null;
  startAtIso: string;
}

function formatDateTime(iso: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function resolveMailCollectionPath(): string {
  const raw = process.env.EMAIL_COLLECTION_PATH?.trim() || "mail";
  return raw.replace(/^\/+|\/+$/g, "");
}

async function resolveBusinessMailContext(businessId: string) {
  const db = getFirestore();
  const businessSnap = await db.collection("businesses").doc(businessId).get();
  if (!businessSnap.exists) {
    return null;
  }

  const business = businessSnap.data() as Record<string, any>;
  const timezone =
    typeof business.timezone === "string" && business.timezone.trim().length > 0
      ? business.timezone
      : "Europe/Bratislava";
  const businessName =
    typeof business.name === "string" && business.name.trim().length > 0
      ? business.name.trim()
      : "PAPI HAIR DESIGN";

  return { business, timezone, businessName };
}

export async function queueCustomerBookingEmail(
  input: QueueBookingEmailInput
): Promise<{ queued: boolean; reason?: string }> {
  const db = getFirestore();
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const { timezone, businessName } = context;
  const whenText = formatDateTime(input.startAtIso, timezone);
  const subject = `Potvrdenie rezervácie – ${businessName}`;
  const text =
    `Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},\n\n` +
    `vaša rezervácia je úspešne potvrdená.\n` +
    `Služba: ${input.serviceName ?? "-"}\n` +
    `Termín: ${whenText}\n` +
    `ID rezervácie: ${input.appointmentId}\n\n` +
    (input.historyAccessUrl
      ? `História rezervácií: ${input.historyAccessUrl}\n\n`
      : "") +
    `Tešíme sa na vašu návštevu.\n${businessName}`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <h2 style="margin:0 0 12px">Rezervácia potvrdená</h2>
      <p>Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},</p>
      <p>vaša rezervácia je úspešne potvrdená.</p>
      <ul style="padding-left:18px">
        <li><strong>Služba:</strong> ${input.serviceName ?? "-"}</li>
        <li><strong>Termín:</strong> ${whenText}</li>
      </ul>
      <p style="margin-top:14px">ID rezervácie: <code>${input.appointmentId}</code></p>
      ${input.historyAccessUrl
        ? `<p><a href="${input.historyAccessUrl}" style="display:inline-block;padding:10px 16px;background:#9bd3f7;color:#0f172a;text-decoration:none;border-radius:999px;font-weight:600">Moje rezervácie</a></p>`
        : ""}
      <p>Tešíme sa na vašu návštevu.<br/>${businessName}</p>
    </div>
  `;

  const collectionPath = resolveMailCollectionPath();
  await db.collection(collectionPath).add({
    to: [input.customerEmail],
    message: { subject, text, html },
    metadata: {
      source: "booking-confirmation",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
    },
    created_at: new Date().toISOString(),
  });

  return { queued: true };
}

export async function queueCustomerCancellationEmail(
  input: QueueCancellationEmailInput
): Promise<{ queued: boolean; reason?: string }> {
  const db = getFirestore();
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const { timezone, businessName } = context;
  const whenText = formatDateTime(input.startAtIso, timezone);
  const cancelledByText = input.cancelledBy === "admin" ? "prevádzkou" : "zákazníkom";
  const subject = `Rezervácia zrušená – ${businessName}`;
  const text =
    `Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},\n\n` +
    `vaša rezervácia bola zrušená ${cancelledByText}.\n` +
    `Služba: ${input.serviceName ?? "-"}\n` +
    `Termín: ${whenText}\n` +
    `ID rezervácie: ${input.appointmentId}\n\n` +
    `Ak si chcete rezervovať nový termín, kontaktujte nás alebo využite online rezerváciu.\n${businessName}`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <h2 style="margin:0 0 12px">Rezervácia zrušená</h2>
      <p>Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},</p>
      <p>vaša rezervácia bola zrušená ${cancelledByText}.</p>
      <ul style="padding-left:18px">
        <li><strong>Služba:</strong> ${input.serviceName ?? "-"}</li>
        <li><strong>Termín:</strong> ${whenText}</li>
      </ul>
      <p style="margin-top:14px">ID rezervácie: <code>${input.appointmentId}</code></p>
      <p>Ak si chcete rezervovať nový termín, kontaktujte nás alebo využite online rezerváciu.<br/>${businessName}</p>
    </div>
  `;

  await db.collection(resolveMailCollectionPath()).add({
    to: [input.customerEmail],
    message: { subject, text, html },
    metadata: {
      source: "booking-cancellation",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      cancelled_by: input.cancelledBy,
    },
    created_at: new Date().toISOString(),
  });

  return { queued: true };
}

export async function queueAdminBookingNotificationEmail(
  input: QueueAdminNotificationInput
): Promise<{ queued: boolean; reason?: string }> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!adminEmail) {
    return { queued: false, reason: "missing_admin_notification_email" };
  }

  const db = getFirestore();
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const { timezone, businessName } = context;
  const whenText = formatDateTime(input.startAtIso, timezone);
  const baseUrl =
    process.env.PUBLIC_BOOKING_BASE_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    "https://booking.papihairdesign.sk";
  const adminCalendarUrl = `${baseUrl.replace(/\/+$/g, "")}/admin/calendar`;

  const subject = `Nová rezervácia – ${businessName}`;
  const text =
    `Nová rezervácia v ${businessName}\n\n` +
    `Klient: ${input.customerName ?? "-"}\n` +
    `E-mail: ${input.customerEmail ?? "-"}\n` +
    `Telefón: ${input.customerPhone ?? "-"}\n` +
    `Služba: ${input.serviceName ?? "-"}\n` +
    `Termín: ${whenText}\n` +
    `Detail: ${adminCalendarUrl}`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <h2 style="margin:0 0 12px">Nová rezervácia</h2>
      <ul style="padding-left:18px">
        <li><strong>Klient:</strong> ${input.customerName ?? "-"}</li>
        <li><strong>E-mail:</strong> ${input.customerEmail ?? "-"}</li>
        <li><strong>Telefón:</strong> ${input.customerPhone ?? "-"}</li>
        <li><strong>Služba:</strong> ${input.serviceName ?? "-"}</li>
        <li><strong>Termín:</strong> ${whenText}</li>
      </ul>
      <p style="margin-top:14px">
        <a href="${adminCalendarUrl}" style="display:inline-block;padding:10px 16px;background:#9bd3f7;color:#0f172a;text-decoration:none;border-radius:999px;font-weight:600">
          Otvoriť admin kalendár
        </a>
      </p>
    </div>
  `;

  await db.collection(resolveMailCollectionPath()).add({
    to: [adminEmail],
    message: { subject, text, html },
    metadata: {
      source: "admin-booking-notification",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
    },
    created_at: new Date().toISOString(),
  });

  return { queued: true };
}
