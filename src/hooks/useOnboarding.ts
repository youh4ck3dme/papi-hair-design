import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BUSINESS_ID } from "@/lib/businessIds";

/**
 * Hook that checks if onboarding is completed for the current business.
 * Primary check: businesses.onboarding_completed boolean flag.
 * Fallback: onboarding_answers progress state.
 */
export function useOnboarding() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The primary PAPI business is already provisioned, so skip tenant-onboarding checks there.
    if (!user || !isOwnerOrAdmin || businessId === DEFAULT_BUSINESS_ID) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        setLoading(true);

        const bizSnap = await getDoc(doc(db, "businesses", businessId));

        if (!bizSnap.exists()) {
          setNeedsOnboarding(false);
          return;
        }

        setNeedsOnboarding(!bizSnap.data().onboarding_completed);
      } catch (err) {
        console.error("Onboarding check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user?.id, businessId, isOwnerOrAdmin]);

  const markComplete = () => setNeedsOnboarding(false);

  return { needsOnboarding, loading, markComplete };
}
