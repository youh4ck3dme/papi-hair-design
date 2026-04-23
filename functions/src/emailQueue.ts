import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { buildCustomerCalendarLinks } from "./calendarInvite";
import { normalizePhone, resolvePublicBookingBaseUrl } from "./publicBookingAccess";
import { readSecret } from "./secretManager";
import { APP_BRAND_NAME } from "./brandConfig";

interface QueueBookingEmailInput {
  businessId: string;
  appointmentId: string;
  customerEmail: string;
  customerName: string | null;
  serviceName: string | null;
  startAtIso: string;
  endAtIso?: string | null;
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

interface QueueAdminCancellationEmailInput extends Omit<QueueCancellationEmailInput, "customerEmail"> {
  customerEmail: string | null;
  customerPhone: string | null;
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
  heroNote?: string;
  highlight?: {
    label: string;
    value: string;
    valueColor?: string;
  };
  rows: EmailRow[];
  primaryAction?: EmailAction;
  secondaryAction?: EmailAction;
  extraActions?: EmailAction[];
  closing: string;
  footerNote?: string;
};

const EMAIL_COLOR_SYSTEM = {
  canvas: "#ffffff",
  cardStart: "rgba(20,17,14,.92)",
  cardEnd: "rgba(10,8,6,.97)",
  cardBorder: "rgba(220,183,115,.34)",
  cardTopGlow: "rgba(220,183,115,.10)",
  heroTitle: "#ffffff",
  heroMutedText: "#a8a196",
  heroBadgeBg: "rgba(26,22,18,.80)",
  heroBadgeBorder: "rgba(220,183,115,.30)",
  heroBadgeText: "#dcb773",
  surface: "linear-gradient(180deg, rgba(26,22,18,.60) 0%, rgba(0,0,0,.82) 100%)",
  surfaceBorder: "rgba(220,183,115,.30)",
  divider: "rgba(220,183,115,.15)",
  labelText: "#dcb773",
  valueText: "#ffffff",
  bodyText: "#d6d0c4",
  mutedText: "#b2ab9f",
  linkText: "#dcb773",
  primaryButtonText: "#000000",
  primaryButtonBg: "linear-gradient(90deg, #dcb773 0%, #ffeaa3 100%)",
  secondaryButtonBg: "linear-gradient(180deg, #1a1612 0%, #0c0a08 100%)",
  secondaryButtonText: "#dcb773",
  secondaryButtonBorder: "rgba(220,183,115,.40)",
  highlightBg: "rgba(5,4,3,.60)",
  highlightBorder: "rgba(220,183,115,.20)",
  highlightLabel: "#dcb773",
  highlightText: "#ffffff",
  successText: "#dcb773",
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
    introColor: "#a8a196",
    badgeBg: "rgba(26,22,18,.80)",
    badgeBorder: "rgba(220,183,115,.30)",
    badgeText: "#dcb773",
    highlightBorder: "rgba(220,183,115,.20)",
    highlightLabelColor: "#dcb773",
    highlightValueColor: EMAIL_COLOR_SYSTEM.successText,
    primaryButtonBg: "linear-gradient(90deg, #dcb773 0%, #ffeaa3 100%)",
    primaryButtonShadow: "0 8px 22px rgba(220,183,115,.32)",
  },
  welcome: {
    introColor: "#a8a196",
    badgeBg: "rgba(26,22,18,.80)",
    badgeBorder: "rgba(220,183,115,.30)",
    badgeText: "#dcb773",
    highlightBorder: "rgba(220,183,115,.20)",
    highlightLabelColor: "#dcb773",
    highlightValueColor: EMAIL_COLOR_SYSTEM.welcomeText,
    primaryButtonBg: "linear-gradient(90deg, #dcb773 0%, #ffeaa3 100%)",
    primaryButtonShadow: "0 8px 22px rgba(220,183,115,.32)",
  },
  danger: {
    introColor: "#a8a196",
    badgeBg: "rgba(26,22,18,.80)",
    badgeBorder: "rgba(220,183,115,.30)",
    badgeText: "#dcb773",
    highlightBorder: "rgba(220,183,115,.20)",
    highlightLabelColor: "#dcb773",
    highlightValueColor: "#e06c53",
    primaryButtonBg: "linear-gradient(90deg, #dcb773 0%, #ffeaa3 100%)",
    primaryButtonShadow: "0 8px 22px rgba(220,183,115,.32)",
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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
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

function resolveTelHref(phone?: string | null): string | null {
  const normalizedPhone = normalizePhone(phone);
  return normalizedPhone ? `tel:+${normalizedPhone}` : null;
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
  const businessName = safeString(business.name) ?? APP_BRAND_NAME;

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
  const actions = [template.primaryAction, template.secondaryAction, ...(template.extraActions ?? [])]
    .filter((action): action is EmailAction => Boolean(action));

  if (template.highlight) {
    textParts.push(`${template.highlight.label}: ${template.highlight.value}`);
  }

  if (template.rows.length > 0) {
    textParts.push("", "Detaily:");
    template.rows.forEach((row) => {
      textParts.push(`- ${row.label}: ${row.value}`);
    });
  }

  if (actions.length > 0) {
    textParts.push("");
    actions.forEach((action, index) => {
      textParts.push(`${index === 0 ? "Primárne" : "Ďalšie"}: ${action.label} — ${action.href}`);
    });
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
              <td style="padding:18px 18px 18px 22px;border-bottom:1px solid ${EMAIL_COLOR_SYSTEM.divider};font-size:11px;color:${EMAIL_COLOR_SYSTEM.labelText};text-transform:uppercase;letter-spacing:.16em;width:34%;vertical-align:top;">
                ${escapeHtml(row.label)}
              </td>
              <td style="padding:18px 22px 18px 18px;border-bottom:1px solid ${EMAIL_COLOR_SYSTEM.divider};font-size:17px;line-height:1.5;color:${EMAIL_COLOR_SYSTEM.valueText};font-weight:600;vertical-align:top;">
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

  const actionsHtml = actions
    .map(
      (action, index) => `
        <a
          href="${escapeAttr(action.href)}"
          style="
            display:inline-block;
            margin:0 12px 12px 0;
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

  const footerPhoneHref = resolveTelHref(context.businessPhone);
  const footerHtml = `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid ${EMAIL_COLOR_SYSTEM.divider};text-align:center;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(220,183,115,.50);margin-bottom:8px;font-weight:700;">
        ${escapeHtml(context.businessName)}
      </div>
      <div style="font-size:14px;line-height:1.7;color:${EMAIL_COLOR_SYSTEM.mutedText};">
        ${context.businessAddress ? `<div>${escapeHtml(context.businessAddress)}</div>` : ""}
        ${footerPhoneHref ? `<div><a href="${escapeAttr(footerPhoneHref)}" style="color:${EMAIL_COLOR_SYSTEM.linkText};text-decoration:none;font-weight:600;">${escapeHtml(context.businessPhone ?? "")}</a></div>` : ""}
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
          <td align="center" style="padding:24px 12px;background:${EMAIL_COLOR_SYSTEM.canvas};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;border-collapse:separate;">
              <tr>
                <td style="position:relative;padding:0 24px 30px;border-radius:24px;background:linear-gradient(180deg, ${EMAIL_COLOR_SYSTEM.cardStart} 0%, ${EMAIL_COLOR_SYSTEM.cardEnd} 100%);border:1px solid ${EMAIL_COLOR_SYSTEM.cardBorder};box-shadow:0 10px 40px rgba(0,0,0,.90), inset 0 1px 2px rgba(255,255,255,.05);">
                  <div style="height:32px;background:linear-gradient(180deg, ${EMAIL_COLOR_SYSTEM.cardTopGlow} 0%, transparent 100%);border-radius:23px 23px 0 0;"></div>
                  <div style="text-align:center;margin-top:-30px;padding-bottom:18px;">
                    <div style="display:inline-block;padding:8px;border-radius:999px;background:linear-gradient(180deg, #14110e 0%, #0a0806 100%);border:1px solid #dcb773;box-shadow:0 4px 10px rgba(0,0,0,.8), inset 0 1px 1px rgba(255,255,255,.05);">
                    <img
                      src="${escapeAttr(logoUrl)}"
                      width="72"
                      height="72"
                      alt="${escapeAttr(context.businessName)}"
                      style="display:block;margin:0 auto;width:72px;height:72px;border:0;outline:none;text-decoration:none;border-radius:999px;"
                    />
                    </div>
                  </div>
                  <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${variant.badgeBg};border:1px solid ${variant.badgeBorder};font-size:11px;font-weight:700;letter-spacing:.20em;text-transform:uppercase;color:${variant.badgeText};box-shadow:inset 0 1px 1px rgba(255,255,255,.05);">
                    ${escapeHtml(template.eyebrow)}
                  </div>
                  ${template.heroNote ? `<div style="margin-top:18px;font-size:13px;text-transform:uppercase;letter-spacing:.26em;color:${EMAIL_COLOR_SYSTEM.heroBadgeText};font-weight:700;text-align:center;">${escapeHtml(template.heroNote)}</div>` : ""}
                  <h1 style="margin:18px 0 0;font-size:28px;line-height:1.12;color:${EMAIL_COLOR_SYSTEM.heroTitle};font-weight:800;letter-spacing:-.02em;text-align:left;">
                    ${escapeHtml(template.title)}
                  </h1>
                  <p style="margin:16px 0 0;font-size:18px;line-height:1.7;color:${escapeAttr(template.introColor ?? variant.introColor)};font-weight:400;">
                    ${escapeHtml(template.intro)}
                  </p>
                  ${highlightHtml}
                  <div style="margin-top:26px;padding:0;border-radius:16px;background:${EMAIL_COLOR_SYSTEM.surface};border:1px solid ${EMAIL_COLOR_SYSTEM.surfaceBorder};box-shadow:0 4px 15px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.03);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      ${rowsHtml}
                    </table>
                  </div>
                  <div style="padding:28px 0 4px;">
                    ${actionsHtml}
                  </div>
                  <div style="padding-top:8px;font-size:16px;line-height:1.9;color:${EMAIL_COLOR_SYSTEM.bodyText};text-align:center;">
                    ${escapeHtml(template.closing)}
                  </div>
                  ${template.footerNote ? `<div style="padding-top:16px;font-size:14px;line-height:1.8;color:${EMAIL_COLOR_SYSTEM.mutedText};text-align:center;">${escapeHtml(template.footerNote)}</div>` : ""}
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
  const businessPhoneHref = resolveTelHref(context.businessPhone);
  const contactHref = businessPhoneHref
    ? businessPhoneHref
    : context.businessEmail
      ? `mailto:${context.businessEmail}`
      : bookingUrl;
  const calendarLinks = buildCustomerCalendarLinks({
    appointmentId: input.appointmentId,
    businessName: context.businessName,
    businessAddress: context.businessAddress,
    serviceName: input.serviceName,
    startAtIso: input.startAtIso,
    endAtIso: input.endAtIso,
    historyAccessUrl: input.historyAccessUrl,
  });
  const actions: EmailAction[] = [
    input.historyAccessUrl
      ? { label: "Moje rezervácie", href: input.historyAccessUrl }
      : { label: "Rezervovať termín", href: bookingUrl },
  ];

  if (calendarLinks.googleUrl) {
    actions.push({ label: "Pridať do Google Kalendára", href: calendarLinks.googleUrl });
  }

  if (calendarLinks.icsUrl) {
    actions.push({ label: "Stiahnuť do kalendára (.ics)", href: calendarLinks.icsUrl });
  }

  actions.push({ label: "Kontakt", href: contactHref });
  const [primaryAction, secondaryAction, ...extraActions] = actions;
  const template: RichEmailTemplate = {
    preheader: "Vaša rezervácia je potvrdená a termín je pripravený.",
    eyebrow: "Rezervácia potvrdená",
    subject: "Rezervácia potvrdená",
    title: "Vaša rezervácia je potvrdená",
    variant: "success",
    heroNote: context.businessName,
    intro: input.customerName
      ? `Dobrý deň, ${input.customerName}. Ďakujeme, vaša rezervácia bola úspešne potvrdená a termín je pripravený.`
      : "Ďakujeme, vaša rezervácia bola úspešne potvrdená a termín je pripravený.",
    highlight: {
      label: "Stav rezervácie",
      value: "Potvrdená",
      valueColor: "#dcb773",
    },
    rows: buildBookingSummaryRows({
      serviceName: input.serviceName,
      startAtIso: input.startAtIso,
      timezone: context.timezone,
      appointmentId: input.appointmentId,
    }),
    primaryAction,
    secondaryAction,
    extraActions,
    closing:
      "Vaša rezervácia je uložená v systéme a pripravená na vybraný čas. Ak budete potrebovať čokoľvek zmeniť, stačí sa vrátiť do svojich rezervácií alebo nás kontaktovať.",
    footerNote: `Tešíme sa na vašu návštevu v salóne ${context.businessName}.`,
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
  const cancelledByAdmin = input.cancelledBy === "admin";
  const template: RichEmailTemplate = {
    preheader: cancelledByAdmin
      ? "Rezervácia bola zrušená prevádzkou a evidujeme to v systéme."
      : "Vaša rezervácia bola úspešne zrušená a termín sa uvoľnil.",
    eyebrow: "Rezervácia zrušená",
    subject: cancelledByAdmin ? "Rezervácia bola zrušená" : "Rezervácia úspešne zrušená",
    title: "Rezervácia bola zrušená",
    variant: "danger",
    heroNote: context.businessName,
    intro: input.customerName
      ? cancelledByAdmin
        ? `Dobrý deň, ${input.customerName}. Vaša rezervácia bola zrušená prevádzkou.`
        : `Dobrý deň, ${input.customerName}. Vaša rezervácia bola úspešne zrušená.`
      : cancelledByAdmin
        ? `Vaša rezervácia bola zrušená prevádzkou.`
        : `Vaša rezervácia bola úspešne zrušená.`,
    highlight: {
      label: "Stav rezervácie",
      value: "Zrušená",
      valueColor: "#e06c53",
    },
    rows: buildBookingSummaryRows({
      serviceName: input.serviceName,
      startAtIso: input.startAtIso,
      timezone: context.timezone,
      appointmentId: input.appointmentId,
    }),
    primaryAction: { label: "Rezervovať nový termín", href: bookingUrl },
    secondaryAction: input.historyAccessUrl ? { label: "Moje rezervácie", href: input.historyAccessUrl } : undefined,
    closing: cancelledByAdmin
      ? "Ospravedlňujeme sa za vzniknutú zmenu. Ak vám nový termín vyhovuje, odporúčame si ho vytvoriť čo najskôr, prípadne nás kontaktovať a radi vám pomôžeme osobne."
      : "Vaša rezervácia bola stornovaná a termín je opäť dostupný pre ďalších zákazníkov. Ak si chcete vybrať nový čas, môžete pokračovať hneď nižšie.",
    footerNote: cancelledByAdmin
      ? "Rezervácia bola zrušená prevádzkou a termín sa opäť uvoľnil pre nové rezervácie."
      : "Rezervácia bola úspešne zrušená a termín sa opäť uvoľnil.",
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
    heroNote: "Interná notifikácia",
    intro: "Do systému pribudol nový termín. Nižšie je pripravený rýchly prehľad klienta, služby a rezervácie pre ďalšie spracovanie.",
    highlight: {
      label: "Stav rezervácie",
      value: "Nová rezervácia",
      valueColor: "#dcb773",
    },
    rows: [
      { label: "Klient", value: input.customerName ?? "-" },
      { label: "E-mail", value: input.customerEmail ?? "-" },
      { label: "Telefón", value: input.customerPhone ?? "-" },
      { label: "Služba", value: input.serviceName ?? "-" },
      { label: "Termín", value: formatDateTime(input.startAtIso, context.timezone) },
      { label: "ID rezervácie", value: input.appointmentId },
    ],
    primaryAction: { label: "Otvoriť rezervácie", href: adminAppointmentsUrl },
    secondaryAction: { label: "Kalendár", href: adminCalendarUrl },
    closing:
      "Rezervácia je pripravená na spracovanie. Ak treba termín preveriť alebo upraviť, pokračujte do rezervácií alebo kalendára priamo z administrácie.",
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
  input: QueueAdminCancellationEmailInput
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
    eyebrow: "Rezervácia zrušená",
    subject: cancelledByCustomer ? "Zákazník zrušil rezerváciu" : "Rezervácia bola zrušená adminom",
    title: "Rezervácia bola zrušená",
    variant: "danger",
    heroNote: "Interná notifikácia",
    intro: cancelledByCustomer
      ? "Zákazník zrušil svoju rezerváciu. Nižšie je pripravený prehľad klienta, kontaktu a termínu pre ďalšie spracovanie."
      : "Rezervácia bola zrušená zo strany administrácie. Nižšie je pripravený prehľad klienta a termínu pre ďalšie kroky.",
    highlight: {
      label: "Stav rezervácie",
      value: "Zrušená",
      valueColor: "#e06c53",
    },
    rows: [
      { label: "Klient", value: input.customerName ?? "-" },
      { label: "E-mail", value: input.customerEmail ?? "-" },
      { label: "Telefón", value: input.customerPhone ?? "-" },
      { label: "Služba", value: input.serviceName ?? "-" },
      { label: "Termín", value: formatDateTime(input.startAtIso, context.timezone) },
      { label: "ID rezervácie", value: input.appointmentId },
    ],
    primaryAction: { label: "Otvoriť rezervácie", href: adminAppointmentsUrl },
    secondaryAction: { label: "Kalendár", href: adminCalendarUrl },
    closing:
      "Rezervácia je prepísaná na stav zrušené. Ak treba termín znovu obsadiť alebo ďalej riešiť klienta, pokračujte cez rezervácie alebo kalendár.",
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
    eyebrow: "Účet vytvorený",
    subject: `Vitajte v ${context.businessName}`,
    title: `Vitajte v ${context.businessName}`,
    variant: "welcome",
    heroNote: "Registrácia dokončená",
    intro: input.customerName
      ? `Dobrý deň, ${input.customerName}. Vaše konto bolo úspešne vytvorené a môžete si okamžite rezervovať svoj prvý termín.`
      : "Vaše konto bolo úspešne vytvorené a môžete si okamžite rezervovať svoj prvý termín.",
    highlight: {
      label: "Stav účtu",
      value: "Konto aktívne",
      valueColor: "#f3dfae",
    },
    rows: [
      { label: "E-mail účtu", value: input.customerEmail },
      { label: "Účet", value: "Aktívny" },
      { label: "Rezervácie", value: "K dispozícii online" },
    ],
    primaryAction: { label: "Rezervovať termín", href: `${baseUrl}/booking` },
    secondaryAction: { label: "Môj účet", href: `${baseUrl}/my-account` },
    closing:
      "Ďakujeme, že ste sa zaregistrovali. Ak máte otázky k službám alebo termínom, pokojne nás kontaktujte a svoj prvý termín si môžete vybrať hneď teraz.",
    footerNote: "Táto správa bola odoslaná po úspešnej registrácii a aktivácii účtu.",
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
    subject: "Bol vytvorený nový zákaznícky účet",
    title: "Bol vytvorený nový zákaznícky účet",
    variant: "welcome",
    heroNote: "Interná notifikácia",
    intro: "V systéme pribudol nový registrovaný klient. Nižšie nájdete pripravený prehľad používateľa a času registrácie.",
    highlight: {
      label: "Stav registrácie",
      value: "Nový klient",
      valueColor: "#f3dfae",
    },
    rows: [
      { label: "Meno", value: input.customerName ?? "-" },
      { label: "E-mail", value: input.customerEmail },
      { label: "Čas registrácie", value: formatDateTime(new Date().toISOString(), context.timezone) },
    ],
    primaryAction: { label: "Otvoriť administráciu", href: `${baseUrl}/admin/customers` },
    secondaryAction: { label: "Zákazníci", href: `${baseUrl}/admin/customers` },
    closing: "Používateľ je aktívny a môže okamžite vytvárať rezervácie. Ak chcete skontrolovať profil alebo ďalší kontext, pokračujte do administrácie.",
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
