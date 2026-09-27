import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("."),
    },
  },

  define: {
    "process.env.AUTH_SECRET": JSON.stringify(
      "dogfood_test_secret_for_vitest",
    ),
  },

  test: {
    environment: "node",
    globals: true,
  },
});