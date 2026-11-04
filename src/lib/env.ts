export const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const isConvexConfigured = convexUrl.length > 0;
export const isClerkConfigured = clerkPublishableKey.length > 0;
export const isAppConfigured = isConvexConfigured && isClerkConfigured;
