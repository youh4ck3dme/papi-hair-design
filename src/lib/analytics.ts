import app from "@/integrations/firebase/config";
import {
  getAnalytics,
  isSupported,
  setAnalyticsCollectionEnabled,
  setConsent,
  type Analytics,
} from "firebase/analytics";

const DEFAULT_CONSENT = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

let analyticsPromise: Promise<Analytics | null> | null = null;

async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (
    typeof window === "undefined" ||
    !import.meta.env.PROD ||
    !import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  ) {
    return null;
  }

  if (!analyticsPromise) {
    setConsent(DEFAULT_CONSENT);
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch((error) => {
        console.warn("Analytics initialization skipped:", error);
        return null;
      });
  }

  return analyticsPromise;
}

export async function applyAnalyticsConsent(enabled: boolean): Promise<void> {
  setConsent({
    ...DEFAULT_CONSENT,
    analytics_storage: enabled ? "granted" : "denied",
  });

  const analytics = await getAnalyticsInstance();
  if (!analytics) {
    return;
  }

  setAnalyticsCollectionEnabled(analytics, enabled);
}

export async function initAnalytics(): Promise<void> {
  await applyAnalyticsConsent(false);
}
