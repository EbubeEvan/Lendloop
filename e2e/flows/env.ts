import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Signed-in flows run against a real Clerk dev instance and Convex dev
 * deployment. Keys come from `.env.local` (same file the app uses) and the
 * test accounts from `.env.e2e.local`, so nothing secret is committed.
 */
for (const file of [".env.local", ".env.e2e.local"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) {
    process.loadEnvFile(full);
  }
}

export type Role = "owner" | "borrower" | "admin";

export const AUTH_DIR = path.resolve(process.cwd(), "e2e/.auth");

export function storageStatePath(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

export const E2E_USERS: Record<Role, string | undefined> = {
  owner: process.env.E2E_OWNER_EMAIL,
  borrower: process.env.E2E_BORROWER_EMAIL,
  admin: process.env.E2E_ADMIN_EMAIL,
};

const REQUIRED = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CONVEX_URL",
  "E2E_OWNER_EMAIL",
  "E2E_BORROWER_EMAIL",
] as const;

export function missingFlowEnv(): string[] {
  return REQUIRED.filter((name) => !process.env[name]);
}

export const hasAdminUser = Boolean(E2E_USERS.admin);

/** Guard against pointing the suite at a live Clerk instance. */
export function usesProductionClerk(): boolean {
  return process.env.CLERK_SECRET_KEY?.startsWith("sk_live_") ?? false;
}

export const isCI = Boolean(process.env.CI);
