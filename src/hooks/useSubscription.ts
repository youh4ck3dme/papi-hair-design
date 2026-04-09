
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionStatus = "active" | "canceled" | "incomplete" | "past_due" | "unpaid" | "none";

export interface Subscription {
  id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_end: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setSubscription({
          id: data.id,
          plan_id: data.plan_id,
          status: data.status as SubscriptionStatus,
          current_period_end: data.current_period_end,
        });
      }
      setLoading(false);
    }

    getSubscription();
  }, []);

  const isPro = subscription?.status === "active" || subscription?.status === "past_due";

  return { subscription, isPro, loading };
}
