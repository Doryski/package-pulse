import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  reporter: [["html"], ["list"]],
  fullyParallel: true,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: "retain-on-failure",
    baseURL: "http://localhost:3000",
  },
});
