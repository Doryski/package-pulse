import { defineConfig } from "@playwright/test";

const DEV_SERVER_URL = "http://localhost:3000";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html"]] : [["list"], ["html"]],
  fullyParallel: true,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: "retain-on-failure",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    baseURL: process.env.BASE_URL ?? DEV_SERVER_URL,
  },
  webServer: {
    command: isCI ? "npm start" : "npm run dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
