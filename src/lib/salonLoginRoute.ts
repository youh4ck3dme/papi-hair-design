export const SALON_LOGIN_PATH = "/team-login";
export const LEGACY_SALON_LOGIN_PATH = "/papihairsalon2026";

export function isSalonLoginRoute(pathname: string): boolean {
  return pathname.startsWith(SALON_LOGIN_PATH) || pathname.startsWith(LEGACY_SALON_LOGIN_PATH);
}
