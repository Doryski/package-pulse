import path from "node:path";

import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import tailwindcss from "eslint-plugin-tailwindcss";

const projectRoot = import.meta.dirname;
const tailwindCssConfigPath = path.join(projectRoot, "src/app/globals.css");

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".evidence/**",
    ".claude/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
  tailwindcss.configs.recommended,
  {
    plugins: { tailwindcss },
    settings: {
      tailwindcss: {
        cssConfigPath: tailwindCssConfigPath,
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
      "no-underscore-dangle": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|.*Types$",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "tailwindcss/no-custom-classname": [
        "warn",
        { whitelist: ["cn", "inputs", "toaster"] },
      ],
    },
  },
  {
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
  prettierRecommended,
]);
