import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { APP_CANONICAL_HOST } from "@/lib/brandConfig";

import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";

const AuthShell = lazy(() => import("@/components/auth/AuthShell"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));
const AdminLayout = lazy(() => import("@/components/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const PublicChromeLayout = lazy(() => import("@/components/public/PublicChromeLayout").then((m) => ({ default: m.PublicChromeLayout })));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LiquidPlayground = lazy(() => import("./pages/LiquidPlayground"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OfflinePage = lazy(() => import("./pages/OfflinePage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const AuthPage = lazy(() => import("./pages/Auth"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const CalendarPage = lazy(() => import("./pages/admin/CalendarPage"));
const AppointmentsPage = lazy(() => import("./pages/admin/AppointmentsPage"));
const EmployeesPage = lazy(() => import("./pages/admin/EmployeesPage"));
const ServicesPage = lazy(() => import("./pages/admin/ServicesPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const MySchedulePage = lazy(() => import("./pages/admin/MySchedulePage"));
const ReceptionPage = lazy(() => import("./pages/ReceptionPage"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const BookingHistoryPage = lazy(() => import("./pages/BookingHistoryPage"));
const SalonLoginPage = lazy(() => import("./pages/SalonLoginPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const BootstrapPage = lazy(() => import("./pages/BootstrapPage"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const PlatformPage = lazy(() => import("./pages/PlatformPage"));
const MyAccountPage = lazy(() => import("./pages/MyAccountPage"));
const InstallPrompt = lazy(() => import("@/components/InstallPrompt"));

const LazyFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function useCanonicalHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentLocation = globalThis.location;
    const { hostname, protocol } = currentLocation;

    if (import.meta.env.DEV) return;
    if (protocol !== "https:") return;
    if (hostname === APP_CANONICAL_HOST) return;

    const isFirebaseHost =
      hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com");
    if (!isFirebaseHost) return;

    currentLocation.hostname = APP_CANONICAL_HOST;
  }, []);
}

function RouteInstallPrompt() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isReceptionRoute = location.pathname === "/reception";

  if (isHome || isAdminRoute || isReceptionRoute) {
    return null;
  }

  return <InstallPrompt />;
}

function RetiredDemoRoute() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    globalThis.location.replace("/");
  }, []);

  return <LazyFallback />;
}

const App = () => {
  useCanonicalHostRedirect();
  const salonLoginEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_SALON_LOGIN === "true";
  const bootstrapEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_BOOTSTRAP === "true";
  const platformPageEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_PLATFORM_PAGE === "true";

  return (
    <ThemeProvider attribute="class" forcedTheme="dark" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<LazyFallback />}>
            <RouteInstallPrompt />
            <CookieConsent />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/demo/*" element={<RetiredDemoRoute />} />
              <Route
                path="/platform"
                element={platformPageEnabled ? <PlatformPage /> : <Navigate to="/" replace />}
              />
              <Route element={<PublicChromeLayout />}>
                <Route path="/offline" element={<OfflinePage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route
                  path="/papihairsalon2026"
                  element={salonLoginEnabled ? <SalonLoginPage /> : <Navigate to="/auth" replace />}
                />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/privacy-policy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route element={<AuthShell />}>
                <Route path="/liquid-playground" element={<LiquidPlayground />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route element={<PublicChromeLayout />}>
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/my-account" element={<MyAccountPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/bootstrap"
                    element={bootstrapEnabled ? <BootstrapPage /> : <Navigate to="/auth" replace />}
                  />
                  <Route path="/diagnostics" element={<DiagnosticsPage />} />
                  <Route path="/dashboard/history" element={<BookingHistoryPage />} />
                </Route>
                <Route
                  path="/reception"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin", "employee"]}>
                      <ReceptionPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin"]}>
                      <AdminLayout><DashboardPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/calendar"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin"]}>
                      <AdminLayout><CalendarPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/appointments"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin", "employee"]}>
                      <AdminLayout><AppointmentsPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/employees"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin"]}>
                      <AdminLayout><EmployeesPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/services"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin"]}>
                      <AdminLayout><ServicesPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/customers"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin"]}>
                      <AdminLayout><CustomersPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute allowedRoles={["owner", "admin", "employee"]}>
                      <AdminLayout><SettingsPage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/my"
                  element={
                    <ProtectedRoute allowedRoles={["employee"]}>
                      <AdminLayout><MySchedulePage /></AdminLayout>
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
