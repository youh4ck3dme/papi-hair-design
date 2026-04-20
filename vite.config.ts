import { defineConfig, loadEnv } from "vite";

import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/ – env reload
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-motion': ['framer-motion'],
            'vendor-charts': ['recharts'],
            'vendor-ui': ['sonner', 'lucide-react', 'class-variance-authority', 'tailwind-merge'],
            'vendor-markdown': ['react-markdown', 'react-syntax-highlighter'],
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5678,
      headers: {
        "Cache-Control": "no-store",
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      {
        name: "dev-disable-conditional-requests",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            delete req.headers["if-none-match"];
            delete req.headers["if-modified-since"];
            res.setHeader("Cache-Control", "no-store");
            next();
          });
        },
      },
      {
        name: 'validate-env-vars',
        buildStart() {
          if (mode === 'development') return;
          const required = [
            'VITE_FIREBASE_API_KEY',
            'VITE_FIREBASE_AUTH_DOMAIN',
            'VITE_FIREBASE_PROJECT_ID',
            'VITE_FIREBASE_STORAGE_BUCKET',
            'VITE_FIREBASE_MESSAGING_SENDER_ID',
            'VITE_FIREBASE_APP_ID',
            'VITE_FIREBASE_MEASUREMENT_ID'
          ];
          const missing = required.filter(k => !env[k] && !process.env[k]);
          if (missing.length) {
            throw new Error(
              `\n🔴 BUILD FAILED – chýbajú povinné env vars:\n  ${missing.join('\n  ')}\n`
            );
          }
        },
      },
      react(),

      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "favicon-16x16.png",
          "favicon-32x32.png",
          "favicon-48x48.png",
          "apple-touch-icon.png",
          "android-chrome-192x192.png",
          "android-chrome-512x512.png",
          "maskable-icon-512x512.png",
          "mstile-150x150.png",
          "browserconfig.xml",
        ],
        manifest: false, // use existing site.webmanifest
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/__\/auth/],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                ["script", "style", "image", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/functions\/v1\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
