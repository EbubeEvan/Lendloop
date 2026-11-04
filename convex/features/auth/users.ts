import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { getViewer, initialRole, isAdminEmail } from "../../lib/auth";
import { appError } from "../../lib/errors";

/** Claim names only (never values), to show which token Convex received. */
function claimNames(identity: object): string {
  return Object.keys(identity).sort().join(", ") || "none";
}

function displayName(identity: { name?: string; email: string }): string {
  const name = identity.name?.trim();
  return name && name.length > 0 ? name : (identity.email.split("@")[0] ?? "Neighbor");
}

/**
 * Upserts the signed-in Clerk user. Role is derived server-side from the
 * ADMIN_EMAILS allowlist; a client can never send a role.
 */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      appError("UNAUTHENTICATED", "Sign in to continue.");
    }

    const email = identity.email?.trim().toLowerCase();
    if (!email) {
      appError(
        "INVALID_INPUT",
        'Your sign-in token has no email. Add "email": "{{user.primary_email_address}}" to the Clerk ' +
          'token Convex receives (JWT template "convex", or Sessions → Customize session token when ' +
          `the Convex integration is on), then sign out and in again. Claims received: ${claimNames(identity)}.`,
      );
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      const shouldPromote = isAdminEmail(email) && existing.role !== "admin";
      await ctx.db.patch(existing._id, {
        clerkId: identity.subject,
        email,
        name: displayName({ name: identity.name, email }),
        imageUrl: identity.pictureUrl,
        role: shouldPromote ? "admin" : existing.role,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email,
      name: displayName({ name: identity.name, email }),
      imageUrl: identity.pictureUrl,
      role: initialRole(email),
      trustedLender: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      imageUrl: v.optional(v.string()),
      role: v.union(v.literal("user"), v.literal("admin")),
      trustedLender: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }
    return {
      _id: viewer._id,
      name: viewer.name,
      email: viewer.email,
      imageUrl: viewer.imageUrl,
      role: viewer.role,
      trustedLender: viewer.trustedLender,
    };
  },
});

/**
 * Whether the caller may open admin screens. Used by the Next.js proxy before
 * the page renders — which can be before the client has called `store` for a
 * brand-new user. Existing users answer from their stored role; new users get
 * the role `store` will assign them, so a first-time admin is not turned away.
 * Read-only: the proxy never writes.
 */
export const canAccessAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const viewer = await getViewer(ctx);
    if (viewer) {
      return viewer.role === "admin";
    }

    const email = identity.email?.trim().toLowerCase();
    return email ? initialRole(email) === "admin" : false;
  },
});
