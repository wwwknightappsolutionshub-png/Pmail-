import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { pmailBuildPerformance } from "../../scripts/vite-performance.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), "");
  const apiTarget = `http://localhost:${env.API_PORT || "4000"}`;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.svg",
          "apple-touch-icon.png",
          "pwa-192.png",
          "pwa-512.png",
          "offline.html",
        ],
        manifest: {
          id: "/",
          name: "PMail+",
          short_name: "PMail+",
          description: "Secure cloud mail and workspace tools powered by Prohost Cloud",
          theme_color: "#0f2744",
          background_color: "#0f2744",
          display: "standalone",
          display_override: ["standalone", "minimal-ui", "browser"],
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          categories: ["business", "productivity"],
          shortcuts: [
            {
              name: "Inbox",
              short_name: "Inbox",
              url: "/",
              icons: [{ src: "pwa-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
              name: "Add-ons",
              short_name: "Add-ons",
              url: "/addons",
              icons: [{ src: "pwa-192.png", sizes: "192x192", type: "image/png" }],
            },
          ],
          icons: [
            {
              src: "pwa-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/health/],
          importScripts: ["/sw-push.js"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        devOptions: {
          // Dev SW intercepts Vite module requests and can leave the app stuck on the HTML splash.
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        "@hostnet-demo": resolve(__dirname, "../hostnet-web/src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: pmailBuildPerformance(),
  };
});

