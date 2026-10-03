import { defineConfig } from "@playwright/test";

/**
 * Full-stack end-to-end tests: a real backend (Postgres) and the real frontend.
 * See tests/e2e-full/README.md for how to start the two servers.
 */
export default defineConfig({
  testDir: "./tests/e2e-full",
  globalSetup: "./tests/e2e-full/global-setup.ts",
  workers: 1, // tests share one company and build on each other's data
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_FRONTEND_URL ?? "http://localhost:3101",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
