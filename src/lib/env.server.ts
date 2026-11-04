import "server-only";

import { clerkPublishableKey } from "@/lib/env";

/**
 * Server-only environment for the Next.js app (route handlers, proxy, server
 * components). Importing this from a client component fails the build, so
 * secrets cannot end up in the browser bundle.
 */
export const serverEnv = {
  clerkSecretKey: process.env.CLERK_SECRET_KEY?.trim() ?? "",
} as const;

/** Clerk middleware needs both halves of the key pair. */
export const hasClerkServerKeys = Boolean(clerkPublishableKey && serverEnv.clerkSecretKey);
