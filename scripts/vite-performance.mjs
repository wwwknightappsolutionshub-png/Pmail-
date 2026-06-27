/**
 * Shared Rollup/Vite build tuning for PMail+ and Hostnet web apps.
 * Keeps vendor, shell, and feature code in separate cacheable chunks (PWA-safe).
 */
export function pmailBuildPerformance() {
  return {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) {
              return "react-core";
            }
            if (id.includes("react-router")) {
              return "router";
            }
            if (id.includes("lucide-react")) {
              return "icons";
            }
            return undefined;
          }

          if (id.includes("hostnet-web/src/components/demo/BespokeMailDemo")) {
            return "bespoke-demo";
          }

          if (id.includes("AddonsPage")) {
            return "addons";
          }

          if (id.includes("admin/") && id.includes("hostnet-web")) {
            return "admin";
          }

          if (id.includes("growth/") && id.includes("hostnet-web")) {
            return "growth";
          }

          return undefined;
        },
      },
    },
  };
}
