import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: Array<"owner" | "admin" | "employee" | "customer">;
}

const ADMIN_EMAIL_ALLOWLIST = new Set([
  "papi@papihairdesign.sk",
  "miska@papihairdesign.sk",
  "mato@papihairdesign.sk",
]);

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function resolveFallbackByRole(userRoles: Set<"owner" | "admin" | "employee" | "customer">): string {
  if (userRoles.has("owner") || userRoles.has("admin")) return "/admin";
  if (userRoles.has("employee")) return "/admin/my";
  return "/booking";
}

export default function ProtectedRoute({ children, requireAdmin = false, allowedRoles }: ProtectedRouteProps) {
  const { user, memberships, loading } = useAuth();
  const userRoles = new Set(memberships.map((m) => m.role));
  const isAllowlistedAdmin = ADMIN_EMAIL_ALLOWLIST.has(normalizeEmail(user?.email));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireAdmin) {
    const hasAdmin = userRoles.has("owner") || userRoles.has("admin") || isAllowlistedAdmin;
    if (!hasAdmin) return <Navigate to={resolveFallbackByRole(userRoles)} replace />;
  }

  if (allowedRoles?.length) {
    const hasAllowedRole =
      allowedRoles.some((role) => userRoles.has(role)) ||
      (isAllowlistedAdmin && (allowedRoles.includes("owner") || allowedRoles.includes("admin")));

    if (!hasAllowedRole) {
      return <Navigate to={resolveFallbackByRole(userRoles)} replace />;
    }
  }

  return <>{children}</>;
}
