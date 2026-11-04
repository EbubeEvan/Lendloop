import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { writeAuditLog } from "../../lib/audit";
import { requireAdmin, requireViewer } from "../../lib/auth";
import { appError } from "../../lib/errors";

export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    trusted: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    requireAdmin(viewer);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      appError("NOT_FOUND", "That neighbor no longer exists.");
    }

    await ctx.db.patch(target._id, {
      trustedLender: args.trusted,
      updatedAt: Date.now(),
    });
    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: args.trusted ? "user.trusted_lender_granted" : "user.trusted_lender_revoked",
      entityType: "user",
      entityId: target._id,
    });

    return null;
  },
});
