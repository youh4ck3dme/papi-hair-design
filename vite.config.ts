import { defineConfig, loadEnv } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/ – env reload
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return ({
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['sonner', 'lucide-react', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    host: "::",
    port: 5678,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    // Build-time guard: fails vite build (and Vercel deploy) if required env vars are missing
    {
      name: 'validate-env-vars',
      buildStart() {
        if (mode === 'development') return; // skip in dev server
        const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
        const missing = required.filter(k => !env[k] && !process.env[k]);
        if (missing.length) {
          throw new Error(
            `\n🔴 BUILD FAILED – chýbajú povinné env vars:\n  ${missing.join('\n  ')}\n` +
            `Nastav ich v Vercel Dashboard → Settings → Environment Variables.\n`
          );
        }
      },
    },
    react(),
    sentryVitePlugin({
      org: "YOUR_SENTRY_ORG",
      project: "YOUR_SENTRY_PROJECT",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Upload source maps in production builds
      sourcemaps: {
        assets: ["dist/**/*.js"],
      },
      release: {
        name: `${process.env.npm_package_version}-${process.env.GIT_SHA || 'dev'}`,
        finalize: true,
      },
    }),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "placeholder.svg", "pwa-icon-192.png", "pwa-icon-512.png"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            urlPattern: /\.(js|css|png|jpg|jpeg|svg|gif|woff2?)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "PAPI HAIR DESIGN – Booking",
        short_name: "PHD Booking",
        description: "Moderný a rýchly rezervačný systém pre PAPI HAIR DESIGN",
        start_url: "/booking",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0b0b",
        theme_color: "#0b0b0b",
        categories: ["business", "lifestyle"],
        icons: [
          { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});});
