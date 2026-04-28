import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AppSplashScreen } from "@/components/AppSplashScreen";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildAdminLoginPath,
  hasOwnerAdminMembershipForBusiness,
  sanitizeAdminReturnTo,
} from "@/lib/adminRouteSecurity";
import { DEFAULT_BUSINESS_ID } from "@/lib/businessIds";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, memberships, loading, membershipsLoading } = useAuth();
  const location = useLocation();

  if (loading || membershipsLoading) {
    return <AppSplashScreen />;
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
