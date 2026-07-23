import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the Express backend, so the browser only ever
// talks to one origin (no CORS in dev, and SSE streams straight through).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: false,
  },
  server: {
    // 5173 is often taken by other Vite apps; prefer 5174 (falls through if busy).
    port: 5174,
    proxy: {
      // Regex, not a bare "/api" prefix: a plain prefix also swallows client
      // routes that merely start with those characters (e.g. /api-explorer),
      // proxying them to Express, which 404s instead of Vite serving the SPA.
      "^/api/": {
        target: "http://localhost:4100",
        changeOrigin: true,
      },
    },
  },
});
