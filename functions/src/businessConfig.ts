import { APP_BRAND_NAME } from "./brandConfig";

const LEGACY_FALLBACK_BUSINESS_ID = "papi-hair-design-main";

function normalizeValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeBootstrapEmail(value: string | null | undefined): string | null {
  const normalized = normalizeValue(value);
  return normalized ? normalized.toLowerCase() : null;
}

function readEmailList(...values: Array<string | undefined>): string[] {
  const unique = new Set<string>();

  for (const raw of values) {
    if (!raw) continue;

    for (const item of raw.split(",")) {
      const email = normalizeBootstrapEmail(item);
      if (email) unique.add(email);
    }
  }

  return [...unique];
}

export const DEFAULT_BUSINESS_ID =
  normalizeValue(process.env.PRIMARY_BUSINESS_ID) ?? LEGACY_FALLBACK_BUSINESS_ID;

export const DEFAULT_BUSINESS_NAME =
  normalizeValue(process.env.PRIMARY_BUSINESS_NAME) ?? APP_BRAND_NAME;

export const BOOTSTRAP_OWNER_EMAILS = new Set<string>(
  readEmailList(
    process.env.BOOTSTRAP_OWNER_EMAILS,
    process.env.PRIMARY_OWNER_EMAIL,
    process.env.VITE_PAPI_EMAIL,
  ),
);

export const BOOTSTRAP_EMPLOYEE_EMAILS = readEmailList(
  process.env.BOOTSTRAP_EMPLOYEE_EMAILS,
  process.env.VITE_EMPLOYEE_EMAILS,
  process.env.VITE_MATO_EMAIL,
  process.env.VITE_MISKA_EMAIL,
);

export function isBootstrapOwnerEmail(email: string | null | undefined): boolean {
  const normalized = normalizeBootstrapEmail(email);
  return normalized ? BOOTSTRAP_OWNER_EMAILS.has(normalized) : false;
}
