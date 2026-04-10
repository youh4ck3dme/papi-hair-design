import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { isAdminAllowlisted, isEmployeeAllowlisted } from "@/lib/adminAllowlist";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: Array<"owner" | "admin" | "employee" | "customer">;
}

function resolveFallbackByRole(userRoles: Set<"owner" | "admin" | "employee" | "customer">): string {
  if (userRoles.has("owner") || userRoles.has("admin")) return "/admin";
  if (userRoles.has("employee")) return "/admin/my";
  return "/booking";
}

export default function ProtectedRoute({ children, requireAdmin = false, allowedRoles }: ProtectedRouteProps) {
  const { user, memberships, loading } = useAuth();
  const { pathname } = useLocation();
  const userRoles = new Set(memberships.map((m) => m.role));
  const isAllowlistedAdmin = isAdminAllowlisted(user?.email);
  const isAllowlistedEmployee = isEmployeeAllowlisted(user?.email);
  const hasAdminRole = userRoles.has("owner") || userRoles.has("admin");
  const requestsAdminPrivileges =
    requireAdmin || !!allowedRoles?.some((role) => role === "owner" || role === "admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (pathname.startsWith("/admin")) {
      return <Navigate to="/papihairsalon2026" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  // Allowlisted emails can enter admin only after bootstrap creates a real membership.
  // This prevents UI access with missing write permissions.
  if (isAllowlistedAdmin && requestsAdminPrivileges && !hasAdminRole && memberships.length === 0) {
    return <Navigate to="/bootstrap" replace />;
  }

  if (requireAdmin) {
    if (!hasAdminRole) return <Navigate to={resolveFallbackByRole(userRoles)} replace />;
  }

  if (allowedRoles?.length) {
    const hasAllowedRole = allowedRoles.some((role) => userRoles.has(role));
    const allowedByEmployeeList = allowedRoles.includes("employee") && isAllowlistedEmployee;

    if (!hasAllowedRole && !allowedByEmployeeList) {
      return <Navigate to={resolveFallbackByRole(userRoles)} replace />;
    }
  }

  return <>{children}</>;
}
