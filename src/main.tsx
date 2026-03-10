import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "@/i18n";
import "@/styles/booking-calendar.css";
import { ensureStorageAndServiceWorker } from "@/lib/indexed-db-available";

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
ensureStorageAndServiceWorker().then(async () => {
  createRoot(rootEl).render(<App />);
});
