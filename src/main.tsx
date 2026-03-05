// App entry point
import "./sentry.client.ts";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/i18n";
import "@/styles/booking-calendar.css";
import { ensureStorageAndServiceWorker } from "@/lib/indexed-db-available";

const rootEl = document.getElementById("root")!;
ensureStorageAndServiceWorker().then(async () => {
  createRoot(rootEl).render(<App />);
});
