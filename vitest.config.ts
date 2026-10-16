import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

const UNMODIFIED_SHADCN_PRIMITIVES = [
  "card",
  "command",
  "dialog",
  "dropdown-menu",
  "form",
  "input",
  "label",
  "popover",
  "select",
  "separator",
  "skeleton",
  "sonner",
  "table",
  "tooltip",
] as const;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    globals: true,
    setupFiles: "./vitest.setup.ts",
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text-summary", "html", "json-summary"],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
      exclude: [
        "src/test/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "src/instrumentation.ts",
        "src/instrumentation-client.ts",
        "src/app/(home)/components/projects-form/index.ts",
        ...UNMODIFIED_SHADCN_PRIMITIVES.map(
          (name) => `src/components/ui/${name}.tsx`,
        ),
      ],
    },
  },
});
