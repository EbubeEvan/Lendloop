import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { getViewer, isAdminEmail } from "../../lib/auth";
import { appError } from "../../lib/errors";

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
        "Your Clerk session has no email claim. Add `email` to the Convex JWT template.",
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
      role: isAdminEmail(email) ? "admin" : "user",
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
