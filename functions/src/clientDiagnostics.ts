import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { APP_PUBLIC_BOOKING_BASE_URL } from "./brandConfig";
import { hashOpaqueToken } from "./publicBookingAccess";

const MESSAGE_MAX_LENGTH = 500;
const STACK_MAX_LENGTH = 2000;
const ROUTE_MAX_LENGTH = 160;
const SOURCE_MAX_LENGTH = 120;
const SESSION_ID_MAX_LENGTH = 80;
const METADATA_KEY_MAX_LENGTH = 40;
const METADATA_VALUE_MAX_LENGTH = 160;
const MAX_METADATA_ENTRIES = 12;
const ROUTE_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export type ClientDiagnosticCategory =
  | "runtime_error"
  | "unhandled_rejection"
  | "bootstrap_error";

export type ClientDiagnosticLevel = "error" | "warning";

export interface RecordClientDiagnosticData {
  category: ClientDiagnosticCategory;
  message: string;
  level?: ClientDiagnosticLevel;
  route?: string | null;
  source?: string | null;
  stack?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ClientDiagnosticRecord {
  category: ClientDiagnosticCategory;
  level: ClientDiagnosticLevel;
  message: string;
  route: string | null;
  source: string | null;
  stack: string | null;
  session_id: string | null;
  metadata: Record<string, string | number | boolean | null>;
  fingerprint: string;
}

function normalizePathname(pathname: string): string | null {
  const normalized = pathname.trim() || "/";
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return withLeadingSlash.slice(0, ROUTE_MAX_LENGTH) || "/";
}

function sanitizeText(
  value: unknown,
  maxLength: number,
  options: { multiline?: boolean } = {},
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = options.multiline
    ? value.replace(/\r\n/g, "\n").trim()
    : value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  const redacted = normalized.replace(EMAIL_PATTERN, "[redacted-email]");
  return redacted.slice(0, maxLength);
}

export function sanitizeDiagnosticRoute(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ROUTE_SCHEME_PATTERN.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return normalizePathname(parsed.pathname);
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed, APP_PUBLIC_BOOKING_BASE_URL);
    return normalizePathname(parsed.pathname);
  } catch {
    const route = trimmed.split(/[?#]/, 1)[0];
    return normalizePathname(route);
  }
}

export function sanitizeDiagnosticMetadata(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const sanitizedEntries: Array<[string, string | number | boolean | null]> = [];

  Object.entries(value)
    .slice(0, MAX_METADATA_ENTRIES)
    .forEach(([rawKey, rawValue]) => {
      const key = sanitizeText(rawKey, METADATA_KEY_MAX_LENGTH);
      if (!key) {
        return;
      }

      if (rawValue == null) {
        sanitizedEntries.push([key, null]);
        return;
      }

      if (typeof rawValue === "boolean" || typeof rawValue === "number") {
        sanitizedEntries.push([key, rawValue]);
        return;
      }

      if (typeof rawValue === "string") {
        const sanitizedValue = sanitizeText(rawValue, METADATA_VALUE_MAX_LENGTH);
        if (sanitizedValue) {
          sanitizedEntries.push([key, sanitizedValue]);
        }
      }
    });

  return Object.fromEntries(sanitizedEntries);
}

function isValidCategory(value: unknown): value is ClientDiagnosticCategory {
  return value === "runtime_error" || value === "unhandled_rejection" || value === "bootstrap_error";
}

function isValidLevel(value: unknown): value is ClientDiagnosticLevel {
  return value === "error" || value === "warning";
}

export function buildClientDiagnosticRecord(
  data: RecordClientDiagnosticData,
): ClientDiagnosticRecord {
  if (!isValidCategory(data.category)) {
    throw new HttpsError("invalid-argument", "Invalid diagnostic category");
  }

  const message = sanitizeText(data.message, MESSAGE_MAX_LENGTH, { multiline: true });
  if (!message) {
    throw new HttpsError("invalid-argument", "Diagnostic message is required");
  }

  const level = isValidLevel(data.level) ? data.level : "error";
  const route = sanitizeDiagnosticRoute(data.route);
  const source = sanitizeText(data.source, SOURCE_MAX_LENGTH);
  const stack = sanitizeText(data.stack, STACK_MAX_LENGTH, { multiline: true });
  const sessionId = sanitizeText(data.session_id, SESSION_ID_MAX_LENGTH);
  const metadata = sanitizeDiagnosticMetadata(data.metadata);

  const fingerprintSource = `${data.category}|${route ?? "no-route"}|${message}`;

  return {
    category: data.category,
    level,
    message,
    route,
    source,
    stack,
    session_id: sessionId,
    metadata,
    fingerprint: hashOpaqueToken(fingerprintSource),
  };
}

export function buildClientDiagnosticWritePayload(
  request: CallableRequest<RecordClientDiagnosticData>,
): Record<string, unknown> {
  const record = buildClientDiagnosticRecord(request.data);
  const userAgent = sanitizeText(request.rawRequest.headers["user-agent"], 512);

  return {
    ...record,
    user_id: request.auth?.uid ?? null,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
  };
}
