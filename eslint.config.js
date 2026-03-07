import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const sharedRules = {
  ...reactHooks.configs.recommended.rules,
  "react-refresh/only-export-components": "off",
  "react-hooks/exhaustive-deps": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": "off",
};

const sharedPlugins = {
  "react-hooks": reactHooks,
  "react-refresh": reactRefresh,
};

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      ".firebase",
      "supabase/.temp",
      "functions/lib",
      "booking-papihairdesign-sk/**",
      "**/.next/**",
      "e2e-results",
      "test-results",
      "playwright-report",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: sharedPlugins,
    rules: sharedRules,
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["e2e/**/*.ts", "functions/src/**/*.ts", "vite.config.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    plugins: sharedPlugins,
    rules: sharedRules,
  }
);
