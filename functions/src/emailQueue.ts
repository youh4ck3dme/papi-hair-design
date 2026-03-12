import { getFirestore } from "firebase-admin/firestore";

interface QueueBookingEmailInput {
  businessId: string;
  appointmentId: string;
  customerEmail: string;
  customerName: string | null;
  serviceName: string | null;
  employeeName: string | null;
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

export async function queueCustomerBookingEmail(
  input: QueueBookingEmailInput
): Promise<{ queued: boolean; reason?: string }> {
  const db = getFirestore();
  const businessSnap = await db.collection("businesses").doc(input.businessId).get();
  if (!businessSnap.exists) {
    return { queued: false, reason: "business_not_found" };
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
  const whenText = formatDateTime(input.startAtIso, timezone);
  const subject = `Potvrdenie rezervácie – ${businessName}`;
  const text =
    `Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},\n\n` +
    `vaša rezervácia je úspešne potvrdená.\n` +
    `Služba: ${input.serviceName ?? "-"}\n` +
    `Pracovník: ${input.employeeName ?? "-"}\n` +
    `Termín: ${whenText}\n` +
    `ID rezervácie: ${input.appointmentId}\n\n` +
    `Tešíme sa na vašu návštevu.\n${businessName}`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <h2 style="margin:0 0 12px">Rezervácia potvrdená</h2>
      <p>Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},</p>
      <p>vaša rezervácia je úspešne potvrdená.</p>
      <ul style="padding-left:18px">
        <li><strong>Služba:</strong> ${input.serviceName ?? "-"}</li>
        <li><strong>Pracovník:</strong> ${input.employeeName ?? "-"}</li>
        <li><strong>Termín:</strong> ${whenText}</li>
      </ul>
      <p style="margin-top:14px">ID rezervácie: <code>${input.appointmentId}</code></p>
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
