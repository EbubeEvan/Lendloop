import "server-only";

import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

import { convexUrl } from "@/lib/env";

type ClerkAuth = {
  sessionClaims: object | null;
  getToken: (options?: { template?: string }) => Promise<string | null>;
};

/**
 * Same token choice as Convex's ConvexProviderWithClerk: with Clerk's native
 * Convex integration the session token itself is issued for Convex
 * (`aud: "convex"`); otherwise use the `convex` JWT template.
 */
async function convexToken({ sessionClaims, getToken }: ClerkAuth): Promise<string | null> {
  const issuedForConvex =
    sessionClaims !== null && "aud" in sessionClaims && sessionClaims.aud === "convex";
  return issuedForConvex ? await getToken() : await getToken({ template: "convex" });
}

/**
 * Asks Convex — the source of truth for roles — whether the signed-in user is
 * an admin. Used by the proxy so non-admins get a plain 404 for /admin routes
 * before anything renders. Fails closed: any error means "not an admin".
 *
 * This only hides the screens. Every admin query and mutation still checks
 * the role itself with `requireAdmin` in Convex.
 */
export async function isAdminRequest(clerkAuth: ClerkAuth): Promise<boolean> {
  try {
    const token = await convexToken(clerkAuth);
    if (!token) {
      return false;
    }
    return await fetchQuery(api.features.auth.users.canAccessAdmin, {}, { token, url: convexUrl });
  } catch {
    return false;
  }
}
