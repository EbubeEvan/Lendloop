import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const isCI = Boolean(process.env.CI);

/**
 * Smoke tests that run without Clerk or Convex keys, so they work in CI and on
 * a fresh clone. Backend behavior (RBAC, lifecycle, signed webhooks) is covered
 * by the convex-test suites under tests/convex.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // CI builds first, so serve the production bundle; locally use the dev server.
    command: isCI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_CONVEX_URL: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
    },
  },
});
