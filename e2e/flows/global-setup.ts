import { clerkSetup } from "@clerk/testing/playwright";

import { missingFlowEnv, usesProductionClerk } from "./env";

/**
 * Runs once in the main Playwright process. `clerkSetup` fetches a testing
 * token that lets the browser bypass Clerk's bot protection; it is exported
 * through env vars so every worker inherits it.
 */
export default async function globalSetup(): Promise<void> {
  const missing = missingFlowEnv();
  if (missing.length > 0) {
    throw new Error(
      `Signed-in e2e flows need these variables (see README → Testing): ${missing.join(", ")}`,
    );
  }
  if (usesProductionClerk()) {
    throw new Error("Refusing to run e2e flows against a production Clerk instance.");
  }

  await clerkSetup();
}
