import { defineConfig, devices } from "@playwright/test";

import { isCI } from "./e2e/flows/env";

const PORT = 3000;

/**
 * Signed-in flows against a real Clerk dev instance and Convex dev deployment.
 * Needs keys in `.env.local` and test accounts in `.env.e2e.local`
 * (see `.env.e2e.example`). Run with `pnpm test:e2e:flows`.
 */
export default defineConfig({
  testDir: "./e2e/flows",
  globalSetup: "./e2e/flows/global-setup.ts",
  // Flows share real accounts and rate limits, so run them one at a time.
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [
    { name: "auth", testMatch: /auth\.setup\.ts/ },
    // Specs open each user's session explicitly (see helpers.sessionFor), so
    // the default `page` stays signed out.
    { name: "flows", testMatch: /.*\.spec\.ts/, dependencies: ["auth"] },
  ],
  // Locally this reuses your running `pnpm dev` on :3000 (it already has the
  // keys, and Next.js allows only one dev server per project); if none is
  // running, it starts one. CI builds and serves production.
  webServer: {
    command: isCI ? `pnpm build && pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
  },
});
