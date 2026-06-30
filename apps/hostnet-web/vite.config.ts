import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { pmailBuildPerformance } from "../../scripts/vite-performance.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), "");
  const apiTarget = `http://localhost:${env.API_PORT || "4000"}`;
  const googleVerification = env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
  const bingVerification = env.VITE_BING_SITE_VERIFICATION?.trim();
  const ga4Id = env.VITE_GA4_MEASUREMENT_ID?.trim();

  return {
    plugins: [
      react(),
      {
        name: "html-seo-inject",
        transformIndexHtml(html) {
          let next = html;
          if (googleVerification) {
            next = next.replace(
              "</head>",
              `    <meta name="google-site-verification" content="${googleVerification}" />\n  </head>`,
            );
          }
          if (bingVerification) {
            next = next.replace(
              "</head>",
              `    <meta name="msvalidate.01" content="${bingVerification}" />\n  </head>`,
            );
          }
          if (ga4Id && !next.includes("googletagmanager.com/gtag/js")) {
            next = next.replace(
              "</head>",
              `    <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>\n  </head>`,
            );
          }
          return next;
        },
      },
    ],
    server: {
      port: 5174,
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
