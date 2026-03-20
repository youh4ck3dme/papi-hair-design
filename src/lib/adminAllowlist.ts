export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function parseEnvEmailList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.length > 0);
}

function readAdminAllowlistFromEnv(): Set<string> {
  const envEntries = parseEnvEmailList(import.meta.env.VITE_ADMIN_ALLOWLIST as string | undefined);
  const ownerEntry = normalizeEmail(import.meta.env.VITE_PAPI_EMAIL as string | undefined);
  const profileEntries = ownerEntry.length > 0 ? [ownerEntry] : [];

  return new Set<string>([...envEntries, ...profileEntries]);
}

export const ADMIN_EMAIL_ALLOWLIST = readAdminAllowlistFromEnv();

export function isAdminAllowlisted(email: string | null | undefined): boolean {
  return ADMIN_EMAIL_ALLOWLIST.has(normalizeEmail(email));
}
