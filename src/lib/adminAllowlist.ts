const ADMIN_EMAILS = [
  "papi@papihairdesign.sk",
  "miska@papihairdesign.sk",
  "mato@papihairdesign.sk",
] as const;

export const ADMIN_EMAIL_ALLOWLIST = new Set<string>(ADMIN_EMAILS);

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function isAdminAllowlisted(email: string | null | undefined): boolean {
  return ADMIN_EMAIL_ALLOWLIST.has(normalizeEmail(email));
}
