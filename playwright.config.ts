import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  reporter: "html",
  fullyParallel: true,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: "on-first-retry",
    baseURL: "http://localhost:3000",
  },
});
