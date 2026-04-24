import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  buildAdminLoginPath,
  hasOwnerAdminMembershipForBusiness,
  sanitizeAdminReturnTo,
} from "@/lib/adminRouteSecurity";
import { DEFAULT_BUSINESS_ID } from "@/lib/businessIds";

function AdminRouteLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background" role="status" aria-label="Načítavam prístup">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, memberships, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AdminRouteLoader />;
  }

  const returnTo = sanitizeAdminReturnTo(`${location.pathname}${location.search}${location.hash}`);

  if (!user) {
    return <Navigate to={buildAdminLoginPath(returnTo)} replace />;
  }

  if (!hasOwnerAdminMembershipForBusiness(memberships, DEFAULT_BUSINESS_ID)) {
    return <Navigate to="/booking" replace />;
  }

  return <>{children}</>;
}
