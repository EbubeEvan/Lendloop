import { mkdirSync } from "node:fs";

import { clerk } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

import { AUTH_DIR, E2E_USERS, type Role, storageStatePath } from "./env";

mkdirSync(AUTH_DIR, { recursive: true });

/**
 * Signs each test account in once with a Clerk sign-in ticket (no passwords
 * in the repo or env), lets the app provision the Convex user, and saves the
 * session so the flow specs start already signed in.
 */
for (const role of Object.keys(E2E_USERS) as Role[]) {
  const email = E2E_USERS[role];

  setup(`sign in as ${role}`, async ({ page }) => {
    setup.skip(!email, `E2E_${role.toUpperCase()}_EMAIL is not set`);

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: email! });

    // Opening the app provisions the Convex user record for this identity.
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "What's on the block?" })).toBeVisible({
      timeout: 20_000,
    });

    await page.context().storageState({ path: storageStatePath(role) });
  });
}
