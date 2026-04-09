import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { lazy, Suspense, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const AdminLayout = lazy(() => import("@/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));

import LiquidPlayground from "./pages/LiquidPlayground";
const DemoPage = lazy(() => import("./pages/DemoPage"));
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

// H4CK3D Enterprise Components
const PricingPage = lazy(() => import("./pages/Pricing"));
const InstallPrompt = lazy(() => import("@/components/InstallPrompt"));

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();
const CANONICAL_HOST = "booking.papihairdesign.sk";

function useCanonicalHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hostname, pathname, search, hash, protocol } = window.location;

    if (import.meta.env.DEV) return;
    if (protocol !== "https:") return;
    if (hostname === CANONICAL_HOST) return;

    const isFirebaseHost =
      hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com");
    if (!isFirebaseHost) return;

    const targetUrl = `https://${CANONICAL_HOST}${pathname}${search}${hash}`;
    window.location.replace(targetUrl);
  }, []);
}

/** Speed Insights script is only served at /_vercel/... on Vercel; elsewhere it 404s. Render only on Vercel. */
function useSpeedInsightsEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const host =
      typeof globalThis.window !== "undefined"
        ? globalThis.window.location.hostname
        : "";
    const isVercel =
      host.endsWith(".vercel.app") || import.meta.env.VITE_VERCEL === "true";
    setEnabled(!!isVercel);
  }, []);
  return enabled;
}

const App = () => {
  useCanonicalHostRedirect();
  const speedInsightsEnabled = useSpeedInsightsEnabled();
  const salonLoginEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_SALON_LOGIN === "true";
  const bootstrapEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_BOOTSTRAP === "true";

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <InstallPrompt />
            <CookieConsent />
            <AuthProvider>
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/" element={<LiquidPlayground />} />
                  <Route path="/demo" element={<DemoPage />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route
                    path="/papihairsalon2026"
                    element={salonLoginEnabled ? <SalonLoginPage /> : <Navigate to="/auth" replace />}
                  />

                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/offline" element={<OfflinePage />} />
                  <Route path="/install" element={<InstallPage />} />
                  <Route path="/diagnostics" element={<DiagnosticsPage />} />
                  <Route path="/dashboard/history" element={<BookingHistoryPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route
                    path="/bootstrap"
                    element={bootstrapEnabled ? <BootstrapPage /> : <Navigate to="/auth" replace />}
                  />
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
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
          {speedInsightsEnabled && <SpeedInsights />}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
