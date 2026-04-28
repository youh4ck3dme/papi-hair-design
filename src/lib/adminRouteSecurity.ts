import { DEFAULT_BUSINESS_ID } from "@/lib/businessIds";

export const ADMIN_CALENDAR_PATH = "/admin/calendar";
export const ADMIN_LOGIN_PATH = "/admin/login";

export type MembershipRole = "owner" | "admin" | "employee" | "customer";

export type TenantMembership = {
  business_id?: string | null;
  role?: string | null;
};

const OWNER_ADMIN_ROLES = new Set<MembershipRole>(["owner", "admin"]);

function decodeOnce(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function hasProtocolPrefix(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function hasEncodedNavigationToken(value: string): boolean {
  return /%(?:2f|5c|3a)/i.test(value);
}

function isAdminLoginLoop(path: string): boolean {
  return path === ADMIN_LOGIN_PATH || path.startsWith(`${ADMIN_LOGIN_PATH}/`) || path.startsWith(`${ADMIN_LOGIN_PATH}?`);
}

export function sanitizeAdminReturnTo(raw: string | null | undefined): string {
  if (!raw) return ADMIN_CALENDAR_PATH;

  const trimmed = raw.trim();
  if (!trimmed) return ADMIN_CALENDAR_PATH;
  if (trimmed.includes("\\") || trimmed.startsWith("//") || hasProtocolPrefix(trimmed)) return ADMIN_CALENDAR_PATH;
  if (hasEncodedNavigationToken(trimmed)) return ADMIN_CALENDAR_PATH;

  const decoded = decodeOnce(trimmed);
  if (!decoded) return ADMIN_CALENDAR_PATH;
  if (hasEncodedNavigationToken(decoded)) return ADMIN_CALENDAR_PATH;
  if (decoded.includes("\\") || decoded.startsWith("//") || hasProtocolPrefix(decoded)) return ADMIN_CALENDAR_PATH;
  if (!decoded.startsWith("/admin/")) return ADMIN_CALENDAR_PATH;
  if (isAdminLoginLoop(decoded)) return ADMIN_CALENDAR_PATH;

  return decoded;
}

export function buildAdminLoginPath(returnTo: string): string {
  const safeReturnTo = sanitizeAdminReturnTo(returnTo);
  return `${ADMIN_LOGIN_PATH}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function hasOwnerAdminMembershipForBusiness(
  memberships: readonly TenantMembership[],
  businessId: string | null | undefined = DEFAULT_BUSINESS_ID,
): boolean {
  const tenantId = businessId || DEFAULT_BUSINESS_ID;
  return memberships.some(
    (membership) =>
      membership.business_id === tenantId &&
      OWNER_ADMIN_ROLES.has(membership.role as MembershipRole),
  );
}
