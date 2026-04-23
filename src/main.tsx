import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "@/styles/phd-design-system.css";
import "@/i18n";
import { ensureStorageAndServiceWorker } from "@/lib/indexed-db-available";
import { initAnalytics } from "@/lib/analytics";
import { installGlobalDiagnostics, reportClientDiagnostic } from "@/lib/diagnostics";
import { createServiceWorkerRegisterOptions } from "@/lib/serviceWorkerRegistration";
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
const DEV_SW_RESET_KEY = "phd-dev-sw-reset";

function canRegisterServiceWorker(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  if (!import.meta.env.PROD) {
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

async function cleanupDevServiceWorkers(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    import.meta.env.PROD
  ) {
    return true;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasController = Boolean(navigator.serviceWorker.controller);

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if (typeof caches !== "undefined") {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    if (hasController && !sessionStorage.getItem(DEV_SW_RESET_KEY)) {
      sessionStorage.setItem(DEV_SW_RESET_KEY, "1");
      window.location.reload();
      return false;
    }

    sessionStorage.removeItem(DEV_SW_RESET_KEY);
    return true;
  } catch (error) {
    console.warn("Failed to clean up dev service workers:", error);
    return true;
  }
}

function initServiceWorker() {
  if (!canRegisterServiceWorker()) {
    return;
  }

  const serviceWorkerState: {
    updateServiceWorker?: (reloadPage?: boolean) => Promise<void>;
  } = {};

  serviceWorkerState.updateServiceWorker = registerSW(
    createServiceWorkerRegisterOptions(() => serviceWorkerState.updateServiceWorker),
  );
}

async function bootstrap() {
  installGlobalDiagnostics();

  try {
    const shouldContinue = await cleanupDevServiceWorkers();
    if (!shouldContinue) {
      return;
    }
    await ensureStorageAndServiceWorker();
  } catch (error) {
    console.error("Failed to validate storage/service-worker preflight:", error);
    void reportClientDiagnostic({
      category: "bootstrap_error",
      message: "Failed to validate storage/service-worker preflight",
      source: "bootstrap.preflight",
      stack: error instanceof Error ? error.stack ?? null : null,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  void initAnalytics();
  createRoot(rootEl).render(<App />);
  initServiceWorker();
}

bootstrap();
