import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  reporter: "html",
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    video: "on-first-retry",
    baseURL: "http://localhost:3000",
  },
});
