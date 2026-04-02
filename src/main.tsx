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

async function bootstrap() {
  try {
    await ensureStorageAndServiceWorker();
  } catch (error) {
    console.error("Failed to validate storage/service-worker preflight:", error);
  }

  createRoot(rootEl).render(<App />);
  initServiceWorker();
}

bootstrap();
