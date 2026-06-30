import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { pmailBuildPerformance } from "../../scripts/vite-performance.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), "");
  const apiTarget = `http://localhost:${env.API_PORT || "4000"}`;
  const googleVerification = env.VITE_GOOGLE_SITE_VERIFICATION?.trim();

  return {
    plugins: [
      react(),
      {
        name: "html-seo-inject",
        transformIndexHtml(html) {
          if (!googleVerification) return html;
          return html.replace(
            "</head>",
            `    <meta name="google-site-verification" content="${googleVerification}" />\n  </head>`,
          );
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
