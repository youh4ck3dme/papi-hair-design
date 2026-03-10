import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export const DEMO_BUSINESS_ID = "papi-hair-design-main";
const PRIMARY_BUSINESS_ID = (import.meta.env.VITE_PRIMARY_BUSINESS_ID as string | undefined)?.trim() || DEMO_BUSINESS_ID;

const ROLE_ORDER = ["owner", "admin", "employee", "customer"] as const;

function roleRank(role: string) {
  const idx = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number]);
  return idx === -1 ? ROLE_ORDER.length : idx;
}

export function useBusiness() {
  const { memberships } = useAuth();

  const activeMembership = useMemo(() => {
    if (!memberships.length) return null;
    return [...memberships].sort((a, b) => {
      const byRole = roleRank(a.role) - roleRank(b.role);
      if (byRole !== 0) return byRole;

      const preferredA = a.business_id === PRIMARY_BUSINESS_ID ? 0 : 1;
      const preferredB = b.business_id === PRIMARY_BUSINESS_ID ? 0 : 1;
      if (preferredA !== preferredB) return preferredA - preferredB;

      return a.business_id.localeCompare(b.business_id);
    })[0];
  }, [memberships]);

  const businessId = activeMembership?.business_id ?? DEMO_BUSINESS_ID;
  const role = activeMembership?.role ?? null;

  const isOwnerOrAdmin = role === "owner" || role === "admin";
  const isEmployee = role === "employee";
  const isOwner = role === "owner";

  return { businessId, role, isOwnerOrAdmin, isEmployee, isOwner, activeMembership };
}
