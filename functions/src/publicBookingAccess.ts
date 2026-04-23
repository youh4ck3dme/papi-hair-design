import * as crypto from "crypto";
import { APP_PUBLIC_BOOKING_BASE_URL } from "./brandConfig";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(email: string): string {
  const [localRaw, domain] = email.toLowerCase().trim().split("@");
  if (!domain) return email.toLowerCase().trim();
  const local = localRaw.split("+")[0];
  return `${local}@${domain}`;
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;

  if (digits.startsWith("421")) {
    return digits;
  }

  if (digits.length === 9) {
    return `421${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    return `421${digits.slice(1)}`;
  }

  return digits;
}

export function createOpaqueToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashOpaqueToken(token);
  return { token, tokenHash };
}

export function hashOpaqueToken(token: string): string {
  return sha256Hex(token);
}

export function resolvePublicBookingBaseUrl(): string {
  const raw =
    process.env.PUBLIC_BOOKING_BASE_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    APP_PUBLIC_BOOKING_BASE_URL;

  return raw.replace(/\/+$/g, "");
}

export function buildHistoryAccessUrl(reference: string, token: string): string {
  const baseUrl = resolvePublicBookingBaseUrl();
  const params = new URLSearchParams({
    ref: reference,
    access: token,
  });

  return `${baseUrl}/dashboard/history?${params.toString()}`;
}
