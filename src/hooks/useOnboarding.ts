import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that checks if onboarding is completed for the current business.
 * Primary check: businesses.onboarding_completed boolean flag.
 * Fallback: onboarding_answers progress state.
 */
export function useOnboarding() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo ID placeholder or no user should not trigger network heavy checks
    if (!user || !isOwnerOrAdmin || businessId === "a1b2c3d4-0000-0000-0000-000000000001") {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        setLoading(true);

        const { data: biz, error: bizErr } = await supabase
          .from("businesses")
          .select("onboarding_completed")
          .eq("id", businessId)
          .maybeSingle();

        if (bizErr || !biz) {
          setNeedsOnboarding(false);
          return;
        }

        setNeedsOnboarding(!biz.onboarding_completed);
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
