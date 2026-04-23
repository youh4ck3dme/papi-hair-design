import { createRuntimeId } from "@/lib/runtimeId";
import {
  recordClientDiagnostic,
  type ClientDiagnosticCategory,
  type ClientDiagnosticLevel,
  type RecordClientDiagnosticBody,
} from "@/integrations/firebase/recordClientDiagnostic";

const MESSAGE_MAX_LENGTH = 400;
const STACK_MAX_LENGTH = 1800;
const SOURCE_MAX_LENGTH = 120;
const MAX_METADATA_ENTRIES = 10;
const METADATA_VALUE_MAX_LENGTH = 120;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

let diagnosticsInstalled = false;
let diagnosticsSessionId: string | null = null;
const sentFingerprints = new Set<string>();

export interface ClientDiagnosticInput {
  category: ClientDiagnosticCategory;
  message: string;
  level?: ClientDiagnosticLevel;
  route?: string | null;
  source?: string | null;
  stack?: string | null;
  metadata?: Record<string, unknown> | null;
}

function isDiagnosticsEnabled(): boolean {
  return typeof window !== "undefined" && import.meta.env.PROD;
}

function sanitizeText(value: unknown, maxLength: number, multiline = false): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = multiline
    ? value.replace(/\r\n/g, "\n").trim()
    : value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.replace(EMAIL_PATTERN, "[redacted-email]").slice(0, maxLength);
}

function sanitizeRoute(route?: string | null): string | null {
  if (!route || typeof route !== "string") {
    return null;
  }

  try {
    const parsed = new URL(route, window.location.origin);
    return parsed.pathname || "/";
  } catch {
    return route.split(/[?#]/, 1)[0] || null;
  }
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean | null> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, MAX_METADATA_ENTRIES)
      .flatMap(([key, value]) => {
        const normalizedKey = sanitizeText(key, 40);
        if (!normalizedKey) {
          return [];
        }

        if (value == null) {
          return [[normalizedKey, null] as const];
        }

        if (typeof value === "boolean" || typeof value === "number") {
          return [[normalizedKey, value] as const];
        }

        if (typeof value === "string") {
          const normalizedValue = sanitizeText(value, METADATA_VALUE_MAX_LENGTH, true);
          return normalizedValue ? [[normalizedKey, normalizedValue] as const] : [];
        }

        return [];
      }),
  );
}

function buildFingerprint(payload: Pick<RecordClientDiagnosticBody, "category" | "route" | "message" | "source">): string {
  return `${payload.category}|${payload.route ?? "no-route"}|${payload.source ?? "no-source"}|${payload.message}`;
}

function getSessionId(): string {
  if (!diagnosticsSessionId) {
    diagnosticsSessionId = createRuntimeId("diag");
  }
  return diagnosticsSessionId;
}

export function resetDiagnosticsForTests(): void {
  diagnosticsInstalled = false;
  diagnosticsSessionId = null;
  sentFingerprints.clear();
}

export async function reportClientDiagnostic(input: ClientDiagnosticInput): Promise<boolean> {
  if (!isDiagnosticsEnabled()) {
    return false;
  }

  const message = sanitizeText(input.message, MESSAGE_MAX_LENGTH, true);
  if (!message) {
    return false;
  }

  const payload: RecordClientDiagnosticBody = {
    category: input.category,
    message,
    level: input.level ?? "error",
    route: sanitizeRoute(input.route ?? window.location.pathname),
    source: sanitizeText(input.source, SOURCE_MAX_LENGTH),
    stack: sanitizeText(input.stack, STACK_MAX_LENGTH, true),
    session_id: getSessionId(),
    metadata: sanitizeMetadata(input.metadata),
  };

  const fingerprint = buildFingerprint(payload);
  if (sentFingerprints.has(fingerprint)) {
    return false;
  }

  sentFingerprints.add(fingerprint);
  const result = await recordClientDiagnostic(payload);
  return Boolean(result?.ok);
}

function normalizeErrorLike(value: unknown): { message: string; stack: string | null } {
  if (value instanceof Error) {
    return {
      message: value.message || value.name || "Unknown error",
      stack: value.stack ?? null,
    };
  }

  if (typeof value === "string") {
    return {
      message: value,
      stack: null,
    };
  }

  return {
    message: "Unknown runtime error",
    stack: null,
  };
}

export function installGlobalDiagnostics(): void {
  if (!isDiagnosticsEnabled() || diagnosticsInstalled) {
    return;
  }

  diagnosticsInstalled = true;

  window.addEventListener("error", (event) => {
    const errorLike = normalizeErrorLike(event.error ?? event.message);
    void reportClientDiagnostic({
      category: "runtime_error",
      message: errorLike.message,
      source: event.filename ? `window.error:${event.filename}` : "window.error",
      stack: errorLike.stack,
      metadata: {
        lineno: event.lineno || null,
        colno: event.colno || null,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const errorLike = normalizeErrorLike(event.reason);
    void reportClientDiagnostic({
      category: "unhandled_rejection",
      message: errorLike.message,
      source: "window.unhandledrejection",
      stack: errorLike.stack,
    });
  });
}
