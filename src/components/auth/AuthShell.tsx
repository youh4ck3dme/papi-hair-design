import { Outlet } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

function AnalyticsTracker() {
  usePageAnalytics();
  return null;
}

export default function AuthShell() {
  return (
    <AuthProvider>
      <AnalyticsTracker />
      <Outlet />
    </AuthProvider>
  );
}
