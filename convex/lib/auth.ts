import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { env } from "./env";
import { appError } from "./errors";

type Ctx = QueryCtx | MutationCtx;

export async function getViewer(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function requireViewer(ctx: Ctx): Promise<Doc<"users">> {
  const viewer = await getViewer(ctx);
  if (!viewer) {
    appError("UNAUTHENTICATED", "Sign in to continue.");
  }
  return viewer;
}

/**
 * Role assigned when a user record is first created. `store` and
 * `canAccessAdmin` both use this, so the proxy's answer for a not-yet
 * provisioned user always matches the row `store` is about to write.
 */
export function initialRole(email: string): Doc<"users">["role"] {
  return isAdminEmail(email) ? "admin" : "user";
}

export function isAdmin(viewer: Doc<"users">): boolean {
  return viewer.role === "admin";
}

export function requireAdmin(viewer: Doc<"users">): void {
  if (!isAdmin(viewer)) {
    appError("FORBIDDEN", "This action requires an administrator.");
  }
}

export function requireSelfOrAdmin(viewer: Doc<"users">, userId: Id<"users">): void {
  if (viewer._id !== userId && !isAdmin(viewer)) {
    appError("FORBIDDEN", "You can only access your own records.");
  }
}

export function isAdminEmail(email: string): boolean {
  return env.adminEmails().includes(email.trim().toLowerCase());
}
