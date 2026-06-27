import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { pmailBuildPerformance } from "../../scripts/vite-performance.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), "");
  const apiTarget = `http://localhost:${env.API_PORT || "4000"}`;

  return {
    plugins: [react()],
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
