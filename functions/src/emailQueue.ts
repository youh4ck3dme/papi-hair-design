import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { resolvePublicBookingBaseUrl } from "./publicBookingAccess";
import { readSecret } from "./secretManager";

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
  historyAccessUrl?: string | null;
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

interface QueueRegistrationWelcomeInput {
  businessId: string;
  customerEmail: string;
  customerName: string | null;
}

interface BusinessMailContext {
  business: Record<string, any>;
  timezone: string;
  businessName: string;
  businessAddress: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
}

type MailMessage = {
  subject: string;
  text: string;
  html: string;
};

type EmailVariant = "default" | "success" | "welcome" | "danger";

type SmtpSendResult = {
  sent: boolean;
  reason?: string;
};

type EmailAction = {
  label: string;
  href: string;
};

type EmailRow = {
  label: string;
  value: string;
};

type RichEmailTemplate = {
  subject?: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  variant?: EmailVariant;
  introColor?: string;
  highlight?: {
    label: string;
    value: string;
    valueColor?: string;
  };
  rows: EmailRow[];
  primaryAction?: EmailAction;
  secondaryAction?: EmailAction;
  closing: string;
  footerNote?: string;
};

const EMAIL_COLOR_SYSTEM = {
  canvas: "#060607",
  heroStart: "#050505",
  heroEnd: "#000000",
  heroTitle: "#ffffff",
  heroBorder: "rgba(212,175,55,.28)",
  heroMutedText: "#b7c0cc",
  heroBadgeBg: "rgba(212,175,55,.10)",
  heroBadgeBorder: "rgba(212,175,55,.24)",
  heroBadgeText: "#e7c96d",
  surface: "#f7f3ea",
  surfaceBorder: "rgba(212,175,55,.24)",
  divider: "#ddd2bd",
  labelText: "#7c7466",
  valueText: "#181621",
  bodyText: "#2d2933",
  mutedText: "#756d7b",
  linkText: "#8f6f1f",
  primaryButtonText: "#181510",
  primaryButtonBg: "linear-gradient(135deg, #f3dd9b 0%, #d5b24e 55%, #b78d25 100%)",
  secondaryButtonBg: "#f1ede6",
  secondaryButtonText: "#2a2733",
  secondaryButtonBorder: "#d6cdbd",
  highlightBg: "rgba(0,0,0,.90)",
  highlightBorder: "rgba(212,175,55,.24)",
  highlightLabel: "#d4af37",
  highlightText: "#f8f3e4",
  successText: "#dcb85a",
  welcomeText: "#f0dca4",
  dangerText: "#d92d20",
} as const;

const EMAIL_VARIANTS: Record<
  EmailVariant,
  {
    introColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    highlightBorder: string;
    highlightLabelColor: string;
    highlightValueColor: string;
    primaryButtonBg: string;
    primaryButtonShadow: string;
  }
> = {
  default: {
    introColor: EMAIL_COLOR_SYSTEM.heroMutedText,
    badgeBg: EMAIL_COLOR_SYSTEM.heroBadgeBg,
    badgeBorder: EMAIL_COLOR_SYSTEM.heroBadgeBorder,
    badgeText: EMAIL_COLOR_SYSTEM.heroBadgeText,
    highlightBorder: EMAIL_COLOR_SYSTEM.highlightBorder,
    highlightLabelColor: EMAIL_COLOR_SYSTEM.highlightLabel,
    highlightValueColor: EMAIL_COLOR_SYSTEM.highlightText,
    primaryButtonBg: EMAIL_COLOR_SYSTEM.primaryButtonBg,
    primaryButtonShadow: "0 10px 24px rgba(157,115,15,.20)",
  },
  success: {
    introColor: "#cbd2da",
    badgeBg: "rgba(216,185,92,.12)",
    badgeBorder: "rgba(216,185,92,.28)",
    badgeText: "#f1d98a",
    highlightBorder: "rgba(216,185,92,.24)",
    highlightLabelColor: "#e1c266",
    highlightValueColor: EMAIL_COLOR_SYSTEM.successText,
    primaryButtonBg: "linear-gradient(135deg, #f7e6af 0%, #ddb95d 55%, #c4932b 100%)",
    primaryButtonShadow: "0 12px 28px rgba(163,121,22,.24)",
  },
  welcome: {
    introColor: "#d2d7de",
    badgeBg: "rgba(240,220,164,.12)",
    badgeBorder: "rgba(240,220,164,.24)",
    badgeText: "#f5e4b7",
    highlightBorder: "rgba(240,220,164,.24)",
    highlightLabelColor: "#ecd694",
    highlightValueColor: EMAIL_COLOR_SYSTEM.welcomeText,
    primaryButtonBg: "linear-gradient(135deg, #f7ebc7 0%, #e5c980 54%, #caa04b 100%)",
    primaryButtonShadow: "0 12px 30px rgba(176,140,69,.22)",
  },
  danger: {
    introColor: "#aeb7c2",
    badgeBg: "rgba(217,45,32,.10)",
    badgeBorder: "rgba(217,45,32,.24)",
    badgeText: "#ff8d84",
    highlightBorder: "rgba(217,45,32,.22)",
    highlightLabelColor: "#ff9a92",
    highlightValueColor: EMAIL_COLOR_SYSTEM.dangerText,
    primaryButtonBg: "linear-gradient(135deg, #f4dc9d 0%, #ddb65d 58%, #bc8c2b 100%)",
    primaryButtonShadow: "0 12px 26px rgba(146,43,31,.18)",
  },
};

function formatDateTime(iso: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function formatMoney(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return null;
  }

  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function resolveMailCollectionPath(): string {
  const raw = process.env.EMAIL_COLLECTION_PATH?.trim() || "mail";
  return raw.replace(/^\/+|\/+$/g, "");
}

function normalizeSmtpConfig(raw: Record<string, any> | null | undefined) {
  if (!raw) return null;

  const host = typeof raw.host === "string" ? raw.host.trim() : "";
  const user = typeof raw.user === "string" ? raw.user.trim() : "";
  const from = typeof raw.from === "string" ? raw.from.trim() : "";
  const portNumber = Number(raw.port);
  const port = Number.isFinite(portNumber) && portNumber > 0 ? portNumber : 465;
  const passwordSecret = typeof raw.password_secret === "string" ? raw.password_secret.trim() : "";

  if (!host || !user || !from || !passwordSecret) return null;

  return {
    host,
    port,
    user,
    from,
    passwordSecret,
  };
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function dedupeRecipients(recipients: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const raw of recipients) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }

  return deduped;
}

function resolveAdminNotificationRecipients(business: Record<string, any>): string[] {
  const configured = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (configured) {
    return dedupeRecipients(
      configured
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    );
  }

  const fallback = safeString(business.email);
  return fallback ? dedupeRecipients([fallback]) : [];
}

async function resolveBusinessMailContext(businessId: string): Promise<BusinessMailContext | null> {
  const db = getFirestore();
  const businessSnap = await db.collection("businesses").doc(businessId).get();
  if (!businessSnap.exists) {
    return null;
  }

  const business = businessSnap.data() as Record<string, any>;
  const timezone = safeString(business.timezone) ?? "Europe/Bratislava";
  const businessName = safeString(business.name) ?? "PAPI HAIR DESIGN";

  return {
    business,
    timezone,
    businessName,
    businessAddress: safeString(business.address),
    businessEmail: safeString(business.email),
    businessPhone: safeString(business.phone),
  };
}

async function trySendViaBusinessSmtp(
  business: Record<string, any>,
  recipients: string[],
  message: MailMessage
): Promise<SmtpSendResult> {
  const smtpConfig = normalizeSmtpConfig(business.smtp_config as Record<string, any> | undefined);
  if (!smtpConfig) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    const password = await readSecret(smtpConfig.passwordSecret);
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.from,
      to: recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "smtp_send_failed",
    };
  }
}

async function queueFallbackMail(
  recipients: string[],
  message: MailMessage,
  metadata: Record<string, any>
): Promise<void> {
  const db = getFirestore();
  const collectionPath = resolveMailCollectionPath();
  await db.collection(collectionPath).add({
    to: recipients,
    message,
    metadata,
    created_at: new Date().toISOString(),
  });
}

function buildMessage(
  context: BusinessMailContext,
  template: RichEmailTemplate,
  extraFooterLines: string[] = []
): MailMessage {
  const variant = EMAIL_VARIANTS[template.variant ?? "default"];
  const footerLines = [
    context.businessAddress,
    context.businessPhone,
    context.businessEmail,
    ...extraFooterLines,
  ].filter((line): line is string => typeof line === "string" && line.trim().length > 0);

  const textParts: string[] = [
    template.eyebrow,
    template.title,
    template.intro,
  ];

  if (template.highlight) {
    textParts.push(`${template.highlight.label}: ${template.highlight.value}`);
  }

  if (template.rows.length > 0) {
    textParts.push("", "Detaily:");
    template.rows.forEach((row) => {
      textParts.push(`- ${row.label}: ${row.value}`);
    });
  }

  if (template.primaryAction) {
    textParts.push("", `Primárne: ${template.primaryAction.label} — ${template.primaryAction.href}`);
  }

  if (template.secondaryAction) {
    textParts.push(`Ďalšie: ${template.secondaryAction.label} — ${template.secondaryAction.href}`);
  }

  textParts.push(
    "",
    template.closing,
    "",
    template.footerNote ?? "",
    context.businessName,
    ...footerLines
  );

  const normalizedText = textParts.filter((part) => part.trim().length > 0).join("\n");
  const publicBaseUrl = resolvePublicBookingBaseUrl();
  const logoUrl = `${publicBaseUrl}/icon-512x512.png`;

  const rowsHtml = template.rows.length
    ? template.rows
        .map(
          (row) => `
            <tr>
              <td style="padding:15px 0;border-bottom:1px solid ${EMAIL_COLOR_SYSTEM.divider};font-size:11px;color:${EMAIL_COLOR_SYSTEM.labelText};text-transform:uppercase;letter-spacing:.16em;width:34%;vertical-align:top;">
                ${escapeHtml(row.label)}
              </td>
              <td style="padding:15px 0;border-bottom:1px solid ${EMAIL_COLOR_SYSTEM.divider};font-size:17px;line-height:1.5;color:${EMAIL_COLOR_SYSTEM.valueText};font-weight:600;vertical-align:top;">
                ${escapeHtml(row.value)}
              </td>
            </tr>`
        )
        .join("")
    : "";

  const highlightHtml = template.highlight
    ? `
      <div style="margin:24px 0 0;padding:16px 18px;border-radius:20px;background:${EMAIL_COLOR_SYSTEM.highlightBg};border:1px solid ${variant.highlightBorder};box-shadow:inset 0 1px 0 rgba(255,255,255,.04);">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:${variant.highlightLabelColor};margin-bottom:6px;">
          ${escapeHtml(template.highlight.label)}
        </div>
        <div style="font-size:24px;font-weight:800;line-height:1.25;color:${escapeAttr(template.highlight.valueColor ?? variant.highlightValueColor)};">
          ${escapeHtml(template.highlight.value)}
        </div>
      </div>`
    : "";

  const actionsHtml = [template.primaryAction, template.secondaryAction]
    .filter((action): action is EmailAction => Boolean(action))
    .map(
      (action, index) => `
        <a
          href="${escapeAttr(action.href)}"
          style="
            display:inline-block;
            margin:${index === 0 ? "0 12px 12px 0" : "0 12px 12px 0"};
            padding:14px 26px;
            border-radius:999px;
            background:${index === 0 ? variant.primaryButtonBg : EMAIL_COLOR_SYSTEM.secondaryButtonBg};
            color:${index === 0 ? EMAIL_COLOR_SYSTEM.primaryButtonText : EMAIL_COLOR_SYSTEM.secondaryButtonText};
            text-decoration:none;
            font-weight:700;
            font-size:15px;
            line-height:1.1;
            letter-spacing:.01em;
            border:${index === 0 ? "0" : `1px solid ${EMAIL_COLOR_SYSTEM.secondaryButtonBorder}`};
            box-shadow:${index === 0 ? variant.primaryButtonShadow : "none"};
          "
        >
          ${escapeHtml(action.label)}
        </a>`
    )
    .join("");

  const footerHtml = `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${EMAIL_COLOR_SYSTEM.divider};">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${EMAIL_COLOR_SYSTEM.labelText};margin-bottom:8px;">
        ${escapeHtml(context.businessName)}
      </div>
      <div style="font-size:14px;line-height:1.7;color:${EMAIL_COLOR_SYSTEM.mutedText};">
        ${context.businessAddress ? `<div>${escapeHtml(context.businessAddress)}</div>` : ""}
        ${context.businessPhone ? `<div><a href="tel:${escapeAttr(context.businessPhone.replace(/\s+/g, ""))}" style="color:${EMAIL_COLOR_SYSTEM.linkText};text-decoration:none;font-weight:600;">${escapeHtml(context.businessPhone)}</a></div>` : ""}
        ${context.businessEmail ? `<div><a href="mailto:${escapeAttr(context.businessEmail)}" style="color:${EMAIL_COLOR_SYSTEM.linkText};text-decoration:none;font-weight:600;">${escapeHtml(context.businessEmail)}</a></div>` : ""}
        ${extraFooterLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
      </div>
    </div>
  `;

  const html = `
    <div style="margin:0;padding:0;background:${EMAIL_COLOR_SYSTEM.canvas};">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(template.preheader)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${EMAIL_COLOR_SYSTEM.canvas};">
        <tr>
          <td align="center" style="padding:28px 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:separate;">
              <tr>
                <td style="padding:32px 30px 22px;border-radius:30px 30px 0 0;background:linear-gradient(180deg, ${EMAIL_COLOR_SYSTEM.heroStart} 0%, ${EMAIL_COLOR_SYSTEM.heroEnd} 100%);border:1px solid ${EMAIL_COLOR_SYSTEM.heroBorder};border-bottom:0;box-shadow:0 20px 48px rgba(0,0,0,.28);">
                  <div style="text-align:center;padding-bottom:20px;">
                    <img
                      src="${escapeAttr(logoUrl)}"
                      width="84"
                      height="84"
                      alt="${escapeAttr(context.businessName)}"
                      style="display:block;margin:0 auto;width:84px;height:84px;border:0;outline:none;text-decoration:none;border-radius:18px;"
                    />
                  </div>
                  <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${variant.badgeBg};border:1px solid ${variant.badgeBorder};font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${variant.badgeText};">
                    ${escapeHtml(template.eyebrow)}
                  </div>
                  <h1 style="margin:18px 0 0;font-size:42px;line-height:1.04;color:${EMAIL_COLOR_SYSTEM.heroTitle};font-weight:800;text-wrap:balance;letter-spacing:-.03em;">
                    ${escapeHtml(template.title)}
                  </h1>
                  <p style="margin:16px 0 0;font-size:16px;line-height:1.8;color:${escapeAttr(template.introColor ?? variant.introColor)};font-weight:400;max-width:560px;">
                    ${escapeHtml(template.intro)}
                  </p>
                  ${highlightHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 32px;border-left:1px solid ${EMAIL_COLOR_SYSTEM.surfaceBorder};border-right:1px solid ${EMAIL_COLOR_SYSTEM.surfaceBorder};border-bottom:1px solid ${EMAIL_COLOR_SYSTEM.surfaceBorder};border-radius:0 0 30px 30px;background:${EMAIL_COLOR_SYSTEM.surface};">
                  <div style="padding:26px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      ${rowsHtml}
                    </table>
                  </div>
                  <div style="padding:28px 0 6px;">
                    ${actionsHtml}
                  </div>
                  <div style="padding-top:14px;font-size:18px;line-height:1.7;color:${EMAIL_COLOR_SYSTEM.bodyText};">
                    ${escapeHtml(template.closing)}
                  </div>
                  ${template.footerNote ? `<div style="padding-top:16px;font-size:14px;line-height:1.75;color:${EMAIL_COLOR_SYSTEM.mutedText};">${escapeHtml(template.footerNote)}</div>` : ""}
                  ${footerHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: template.subject ?? `${template.title} – ${context.businessName}`,
    text: normalizedText.trim(),
    html,
  };
}

async function queueTemplatedMail(
  context: BusinessMailContext,
  recipients: string[],
  template: RichEmailTemplate,
  metadata: Record<string, any>,
  extraFooterLines: string[] = []
): Promise<{ queued: boolean; reason?: string }> {
  const message = buildMessage(context, template, extraFooterLines);
  const smtpResult = await trySendViaBusinessSmtp(context.business, recipients, message);

  if (!smtpResult.sent) {
    await queueFallbackMail(recipients, message, {
      ...metadata,
      fallback_reason: smtpResult.reason ?? "smtp_not_configured",
    });
  }

  return { queued: true };
}

function buildBookingSummaryRows(input: {
  serviceName: string | null;
  startAtIso: string;
  timezone: string;
  appointmentId: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  price?: number | null;
}): EmailRow[] {
  const rows: EmailRow[] = [
    { label: "Služba", value: input.serviceName ?? "-" },
    { label: "Termín", value: formatDateTime(input.startAtIso, input.timezone) },
    { label: "ID rezervácie", value: input.appointmentId },
  ];

  if (input.customerEmail) {
    rows.unshift({ label: "E-mail", value: input.customerEmail });
  }

  if (input.customerPhone) {
    rows.splice(1, 0, { label: "Telefón", value: input.customerPhone });
  }

  if (typeof input.price === "number") {
    const price = formatMoney(input.price);
    if (price) {
      rows.push({ label: "Cena", value: price });
    }
  }

  return rows;
}

export async function queueCustomerBookingEmail(
  input: QueueBookingEmailInput
): Promise<{ queued: boolean; reason?: string }> {
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const bookingUrl = `${resolvePublicBookingBaseUrl()}/booking`;
  const template: RichEmailTemplate = {
    preheader: "Vaša rezervácia je potvrdená a termín je pripravený.",
    eyebrow: "Rezervácia potvrdená",
    subject: "Rezervácia potvrdená",
    title: "Tešíme sa na vašu návštevu",
    variant: "success",
    intro: input.customerName
      ? `Dobrý deň, ${input.customerName}. Vaša rezervácia bola úspešne potvrdená.`
      : "Vaša rezervácia bola úspešne potvrdená a evidujeme ju v systéme.",
    highlight: {
      label: "Najbližší termín",
      value: formatDateTime(input.startAtIso, context.timezone),
      valueColor: "#f0d27a",
    },
    rows: buildBookingSummaryRows({
      serviceName: input.serviceName,
      startAtIso: input.startAtIso,
      timezone: context.timezone,
      appointmentId: input.appointmentId,
    }),
    primaryAction: input.historyAccessUrl
      ? { label: "Moje rezervácie", href: input.historyAccessUrl }
      : { label: "Rezervovať ďalší termín", href: bookingUrl },
    secondaryAction: input.historyAccessUrl ? { label: "Rezervovať ďalší termín", href: bookingUrl } : undefined,
    closing:
      "Ak potrebujete zmenu, vráťte sa do histórie rezervácií alebo nás kontaktujte priamo. Termín už na vás čaká a budeme sa tešiť na vašu návštevu.",
    footerNote: "Rezervácia je potvrdená, uložená v systéme a pripravená na vybraný čas.",
  };

  return queueTemplatedMail(
    context,
    [input.customerEmail],
    template,
    {
      source: "booking-confirmation",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
    }
  );
}

export async function queueCustomerCancellationEmail(
  input: QueueCancellationEmailInput
): Promise<{ queued: boolean; reason?: string }> {
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const bookingUrl = `${resolvePublicBookingBaseUrl()}/booking`;
  const cancelledByLabel = input.cancelledBy === "admin" ? "prevádzkou" : "vami";
  const template: RichEmailTemplate = {
    preheader: "Rezervácia bola zrušená a evidujeme to v systéme.",
    eyebrow: "Rezervácia zrušená",
    subject: "Rezervácia zrušená",
    title: "Rezervácia bola zrušená",
    variant: "danger",
    introColor: "#aeb7c2",
    intro: input.customerName
      ? `Dobrý deň, ${input.customerName}. Vaša rezervácia bola zrušená ${cancelledByLabel}.`
      : `Vaša rezervácia bola zrušená ${cancelledByLabel}.`,
    highlight: {
      label: "Stav rezervácie",
      value: "Zrušená",
      valueColor: "#ff5c51",
    },
    rows: buildBookingSummaryRows({
      serviceName: input.serviceName,
      startAtIso: input.startAtIso,
      timezone: context.timezone,
      appointmentId: input.appointmentId,
    }),
    primaryAction: { label: "Rezervovať nový termín", href: bookingUrl },
    secondaryAction: input.historyAccessUrl ? { label: "Moje rezervácie", href: input.historyAccessUrl } : undefined,
    closing:
      "Ak išlo o omyl, vytvorte si nový termín čo najskôr. Ak potrebujete pomoc s novou rezerváciou, radi vám pomôžeme osobne.",
    footerNote: "Rezervácia bola označená ako zrušená a termín sa opäť uvoľnil pre ďalšie rezervácie.",
  };

  return queueTemplatedMail(
    context,
    [input.customerEmail],
    template,
    {
      source: "booking-cancellation",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      cancelled_by: input.cancelledBy,
    }
  );
}

export async function queueAdminBookingNotificationEmail(
  input: QueueAdminNotificationInput
): Promise<{ queued: boolean; reason?: string }> {
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const recipients = resolveAdminNotificationRecipients(context.business);
  if (recipients.length === 0) {
    return { queued: false, reason: "missing_admin_notification_email" };
  }

  const adminCalendarUrl = `${resolvePublicBookingBaseUrl()}/admin/calendar`;
  const adminAppointmentsUrl = `${resolvePublicBookingBaseUrl()}/admin/appointments`;
  const template: RichEmailTemplate = {
    preheader: "Do systému pribudla nová rezervácia.",
    eyebrow: "Nová rezervácia",
    subject: "Nová rezervácia",
    title: "Prišla nová rezervácia",
    variant: "success",
    intro: "Do kalendára pribudla nová rezervácia. Nižšie je pripravený rýchly premium prehľad klienta, služby a termínu.",
    highlight: {
      label: "Termín",
      value: formatDateTime(input.startAtIso, context.timezone),
      valueColor: "#f0d27a",
    },
    rows: [
      { label: "Klient", value: input.customerName ?? "-" },
      { label: "E-mail", value: input.customerEmail ?? "-" },
      { label: "Telefón", value: input.customerPhone ?? "-" },
      { label: "Služba", value: input.serviceName ?? "-" },
      { label: "ID rezervácie", value: input.appointmentId },
    ],
    primaryAction: { label: "Otvoriť kalendár", href: adminCalendarUrl },
    secondaryAction: { label: "Otvoriť rezervácie", href: adminAppointmentsUrl },
    closing:
      "Rezervácia je pripravená na spracovanie. Ak treba zmenu, otvor kalendár a uprav stav alebo detail rezervácie priamo z administrácie.",
    footerNote: "Interná notifikácia bola odoslaná automaticky po vytvorení novej rezervácie.",
  };

  return queueTemplatedMail(
    context,
    recipients,
    template,
    {
      source: "admin-booking-notification",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
    },
    []
  );
}

export async function queueAdminCustomerCancellationEmail(
  input: QueueCancellationEmailInput & { customerPhone: string | null }
): Promise<{ queued: boolean; reason?: string }> {
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const recipients = resolveAdminNotificationRecipients(context.business);
  if (recipients.length === 0) {
    return { queued: false, reason: "missing_admin_notification_email" };
  }

  const adminCalendarUrl = `${resolvePublicBookingBaseUrl()}/admin/calendar`;
  const adminAppointmentsUrl = `${resolvePublicBookingBaseUrl()}/admin/appointments`;
  const cancelledByCustomer = input.cancelledBy === "customer";
  const template: RichEmailTemplate = {
    preheader: cancelledByCustomer
      ? "Zákazník zrušil rezerváciu a termín sa uvoľnil."
      : "Rezervácia bola zrušená adminom.",
    eyebrow: cancelledByCustomer ? "Zrušenie zákazníkom" : "Zrušenie adminom",
    subject: cancelledByCustomer ? "Zákazník zrušil rezerváciu" : "Admin zrušil rezerváciu",
    title: cancelledByCustomer ? "Zákazník zrušil rezerváciu" : "Admin zrušil rezerváciu",
    variant: "danger",
    intro: cancelledByCustomer
      ? "V systéme evidujeme storno zo strany zákazníka. Nižšie je rýchly prehľad termínu, klienta a kontaktu."
      : "Rezervácia bola zrušená zo strany administrácie. Nižšie je prehľad rezervácie a klienta pre ďalšie spracovanie.",
    highlight: {
      label: "Stav",
      value: cancelledByCustomer ? "Zrušené zákazníkom" : "Zrušené adminom",
      valueColor: "#ff6b61",
    },
    rows: [
      { label: "Klient", value: input.customerName ?? "-" },
      { label: "E-mail", value: input.customerEmail ?? "-" },
      { label: "Telefón", value: input.customerPhone ?? "-" },
      { label: "Služba", value: input.serviceName ?? "-" },
      { label: "Termín", value: formatDateTime(input.startAtIso, context.timezone) },
      { label: "ID rezervácie", value: input.appointmentId },
    ],
    primaryAction: { label: "Otvoriť kalendár", href: adminCalendarUrl },
    secondaryAction: { label: "Otvoriť rezervácie", href: adminAppointmentsUrl },
    closing:
      "Rezervácia bola prepísaná na stav zrušené. Ak chcete termín uvoľniť alebo ihneď znovu obsadiť, pokračujte cez kalendár alebo prehľad rezervácií.",
    footerNote: cancelledByCustomer
      ? "Interná notifikácia bola odoslaná automaticky po storne zákazníkom."
      : "Interná notifikácia bola odoslaná automaticky po storne adminom.",
  };

  return queueTemplatedMail(
    context,
    recipients,
    template,
    {
      source: "admin-customer-cancellation-notification",
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      cancelled_by: input.cancelledBy,
    }
  );
}

export async function queueRegistrationWelcomeEmail(
  input: QueueRegistrationWelcomeInput
): Promise<{ queued: boolean; reason?: string }> {
  const context = await resolveBusinessMailContext(input.businessId);
  if (!context) {
    return { queued: false, reason: "business_not_found" };
  }

  const baseUrl = resolvePublicBookingBaseUrl();
  const template: RichEmailTemplate = {
    preheader: "Účet je pripravený a môžete si rezervovať svoj prvý termín.",
    eyebrow: "Registrácia dokončená",
    subject: "Vitajte v našom rezervačnom systéme",
    title: "Vitajte v našom rezervačnom systéme",
    variant: "welcome",
    intro: input.customerName
      ? `Dobrý deň, ${input.customerName}. Váš účet bol úspešne vytvorený a je pripravený na prvú rezerváciu.`
      : "Váš účet bol úspešne vytvorený a je pripravený na prvú rezerváciu.",
    highlight: {
      label: "E-mail účtu",
      value: input.customerEmail,
      valueColor: "#f3dfae",
    },
    rows: [
      { label: "Účet", value: "Aktívny" },
      { label: "Rezervácie", value: "K dispozícii online" },
    ],
    primaryAction: { label: "Rezervovať termín", href: `${baseUrl}/booking` },
    secondaryAction: { label: "Moje rezervácie", href: `${baseUrl}/dashboard/history` },
    closing:
      "Ak máte otázky k službám alebo termínom, pokojne nás kontaktujte. Sme radi, že ste s nami a prvý termín si môžete vybrať hneď teraz.",
    footerNote: "Táto správa bola odoslaná po úspešnej registrácii účtu a aktivácii prístupu.",
  };

  const customerResult = await queueTemplatedMail(
    context,
    [input.customerEmail],
    template,
    {
      source: "registration-welcome",
      business_id: input.businessId,
      customer_email: input.customerEmail,
    }
  );

  const adminRecipients = dedupeRecipients(
    resolveAdminNotificationRecipients(context.business).filter(
      (email) => email.toLowerCase() !== input.customerEmail.toLowerCase()
    )
  );

  if (adminRecipients.length === 0) {
    return customerResult;
  }

  const adminTemplate: RichEmailTemplate = {
    preheader: "Do systému sa zaregistroval nový používateľ.",
    eyebrow: "Nová registrácia",
    subject: "Nová registrácia používateľa",
    title: "Nový používateľ sa zaregistroval",
    variant: "welcome",
    intro: "V systéme pribudla nová registrácia. Nižšie nájdete pripravený prehľad používateľa a času registrácie.",
    highlight: {
      label: "Registrovaný e-mail",
      value: input.customerEmail,
      valueColor: "#f3dfae",
    },
    rows: [
      { label: "Meno", value: input.customerName ?? "-" },
      { label: "E-mail", value: input.customerEmail },
      { label: "Čas registrácie", value: formatDateTime(new Date().toISOString(), context.timezone) },
    ],
    primaryAction: { label: "Otvoriť zákazníkov", href: `${baseUrl}/admin/customers` },
    secondaryAction: { label: "Otvoriť rezervácie", href: `${baseUrl}/admin/appointments` },
    closing: "Používateľ je aktívny a môže ihneď vytvárať rezervácie. Ak chcete skontrolovať profil alebo históriu, pokračujte do administrácie.",
    footerNote: "Interná notifikácia bola odoslaná automaticky po registrácii používateľa.",
  };

  await queueTemplatedMail(
    context,
    adminRecipients,
    adminTemplate,
    {
      source: "admin-registration-notification",
      business_id: input.businessId,
      customer_email: input.customerEmail,
    }
  );

  return customerResult;
}
