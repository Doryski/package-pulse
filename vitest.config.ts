import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: "./vitest.setup.ts",
    environment: "jsdom",
    coverage: {
      include: ["src/**"],
    },
  },
});
