import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The platform is the only source of data, and it holds the tenancy grant.
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: true } },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
