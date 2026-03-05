import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    tracesSampleRate: 1.0,
    enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLE_DEV === "true",
});
