import "@testing-library/jest-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import sk from "../i18n/sk.json";

const KNOWN_LOG_SNIPPETS = [
  "i18next is maintained with support from Locize",
];

const KNOWN_WARN_SNIPPETS = [
  "React Router Future Flag Warning",
];

const KNOWN_ERROR_PREFIXES = [
  "ServicesPage: failed to save service",
  "Error loading static data:",
  "handleSaveNote error:",
  "DashboardPage: Unable to load stats",
  "updateStatus error:",
];

const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

console.log = (...args: unknown[]) => {
  const joined = args.map(String).join(" ");
  if (KNOWN_LOG_SNIPPETS.some((snippet) => joined.includes(snippet))) return;
  originalConsoleLog(...args);
};

console.info = (...args: unknown[]) => {
  const joined = args.map(String).join(" ");
  if (KNOWN_LOG_SNIPPETS.some((snippet) => joined.includes(snippet))) return;
  originalConsoleInfo(...args);
};

console.warn = (...args: unknown[]) => {
  const joined = args.map(String).join(" ");
  if (KNOWN_WARN_SNIPPETS.some((snippet) => joined.includes(snippet))) return;
  originalConsoleWarn(...args);
};

console.error = (...args: unknown[]) => {
  const first = String(args[0] ?? "");
  if (KNOWN_ERROR_PREFIXES.some((prefix) => first.startsWith(prefix))) return;
  originalConsoleError(...args);
};

// Initialize i18next for tests
i18n.use(initReactI18next).init({
  resources: {
    sk: { translation: sk },
  },
  lng: "sk",
  fallbackLng: "sk",
  interpolation: {
    escapeValue: false,
  },
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => { },
  }),
});

class ResizeObserverMock {
  observe() { }
  unobserve() { }
  disconnect() { }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});
