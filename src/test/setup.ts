import "@testing-library/jest-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import sk from "../i18n/sk.json";

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
