/**
 * Public (browser-safe) environment for the Next.js app.
 *
 * This is the only file in `src/` that reads `NEXT_PUBLIC_*` variables. Next.js
 * inlines them at build time, which only works for literal
 * `process.env.NEXT_PUBLIC_X` reads, so keep them spelled out below. Server
 * secrets live in `env.server.ts`, which cannot be imported by client code.
 */

const DEFAULT_APP_URL = "http://localhost:3000";

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const publicEnv = {
  convexUrl: clean(process.env.NEXT_PUBLIC_CONVEX_URL),
  clerkPublishableKey: clean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  appUrl: clean(process.env.NEXT_PUBLIC_APP_URL) || DEFAULT_APP_URL,
} as const;

export const { convexUrl, clerkPublishableKey, appUrl } = publicEnv;

export const isConvexConfigured = convexUrl.length > 0;
export const isClerkConfigured = clerkPublishableKey.length > 0;
export const isAppConfigured = isConvexConfigured && isClerkConfigured;
