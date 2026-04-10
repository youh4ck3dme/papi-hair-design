import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";

const PAGE_LABELS: Record<string, string> = {
  "/admin":               "Prehľad",
  "/admin/calendar":      "Kalendár",
  "/admin/appointments":  "Rezervácie",
  "/admin/employees":     "Zamestnanci",
  "/admin/services":      "Služby",
  "/admin/customers":     "Zákazníci",
  "/admin/settings":      "Nastavenia",
  "/admin/my":            "Môj rozvrh",
  "/reception":           "Recepcia",
  "/booking":             "Booking (verejný)",
};

export function usePageAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const { businessId, role } = useBusiness();

  useEffect(() => {
    // Logovanie len admin/zamestnanec sekcií
    if (!location.pathname.startsWith("/admin") && location.pathname !== "/reception") return;

    const label = PAGE_LABELS[location.pathname] ?? location.pathname;

    // fire-and-forget, neblokuje UI
    addDoc(collection(db, "page_views"), {
      path:        location.pathname,
      label,
      user_id:     user?.uid ?? null,
      business_id: businessId ?? null,
      role:        role ?? null,
      ts:          serverTimestamp(),
    }).catch(() => {
      // tichá chyba — analytics nesmú rušiť app
    });
  }, [location.pathname]);
}
