import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "@/i18n";
import "@/styles/booking-calendar.css";
import { ensureStorageAndServiceWorker } from "@/lib/indexed-db-available";
import { registerSW } from "virtual:pwa-register";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (import.meta.env.PROD && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const rootEl = document.getElementById("root")!;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function canRegisterServiceWorker(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  if (!("serviceWorker" in navigator)) {
    return false;
  }
  if (window.isSecureContext) {
    return true;
  }
  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

function initServiceWorker() {
  if (!canRegisterServiceWorker()) {
    return;
  }

  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn("Service worker registration skipped:", error);
    },
  });
}

function initAnalytics() {
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  if (typeof window === "undefined" || !measurementId) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });

  if (document.querySelector('script[data-ga-loader="true"]')) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.gaLoader = "true";
  document.head.appendChild(script);
}

async function bootstrap() {
  try {
    await ensureStorageAndServiceWorker();
  } catch (error) {
    console.error("Failed to validate storage/service-worker preflight:", error);
  }

  initAnalytics();
  createRoot(rootEl).render(<App />);
  initServiceWorker();
}

bootstrap();
