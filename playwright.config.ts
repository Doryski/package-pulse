import { defineConfig } from "@playwright/test";

const DEV_SERVER_URL = "http://localhost:3000";

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
    baseURL: DEV_SERVER_URL,
  },
  webServer: {
    command: "npm run dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
