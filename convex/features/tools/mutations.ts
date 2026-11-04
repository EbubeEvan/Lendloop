import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { writeAuditLog } from "../../lib/audit";
import { isAdmin, requireViewer } from "../../lib/auth";
import { todayIso } from "../../lib/dates";
import { appError } from "../../lib/errors";
import { LIMITS, validateToolInput } from "../../lib/validation";
import { toolCategoryValidator, toolConditionValidator } from "../../schema";

export const create = mutation({
  args: {
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
  },
  returns: v.id("tools"),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const input = validateToolInput(args);

    const existing = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
      .collect();
    const activeCount = existing.filter((tool) => !tool.isRemoved).length;
    if (activeCount >= LIMITS.maxActiveListings) {
      appError("RATE_LIMITED", `You can have at most ${LIMITS.maxActiveListings} active listings.`);
    }

    const now = Date.now();
    const toolId = await ctx.db.insert("tools", {
      ownerId: viewer._id,
      name: input.name,
      category: args.category,
      condition: args.condition,
      description: input.description,
      isRemoved: false,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "tool.created",
      entityType: "tool",
      entityId: toolId,
      metadata: { category: args.category },
    });

    return toolId;
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.isRemoved) {
      appError("NOT_FOUND", "That listing no longer exists.");
    }
    if (tool.ownerId !== viewer._id) {
      appError("FORBIDDEN", "You can only edit your own listings.");
    }

    const input = validateToolInput(args);
    await ctx.db.patch(tool._id, {
      name: input.name,
      category: args.category,
      condition: args.condition,
      description: input.description,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "tool.updated",
      entityType: "tool",
      entityId: tool._id,
    });

    return null;
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  returns: v.object({ declinedRequests: v.number() }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.isRemoved) {
      appError("NOT_FOUND", "That listing no longer exists.");
    }

    const admin = isAdmin(viewer);
    if (tool.ownerId !== viewer._id && !admin) {
      appError("FORBIDDEN", "You can only remove your own listings.");
    }

    const today = todayIso();
    const approved = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "approved"))
      .collect();
    if (approved.some((request) => request.endDate >= today)) {
      appError("CONFLICT", "This tool has an active or upcoming loan. Wait for it to be returned.");
    }

    const pending = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
      .collect();

    if (!admin && pending.length > 0) {
      appError("CONFLICT", "Reject the pending requests before removing this listing.");
    }

    const now = Date.now();
    for (const request of pending) {
      await ctx.db.patch(request._id, {
        status: "declined",
        respondedAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.features.automation.actions.dispatchRequestEvent, {
        requestId: request._id,
        type: "request.declined",
      });
    }

    await ctx.db.patch(tool._id, {
      isRemoved: true,
      removedAt: now,
      removedBy: viewer._id,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: admin && tool.ownerId !== viewer._id ? "tool.removed_by_admin" : "tool.removed",
      entityType: "tool",
      entityId: tool._id,
      metadata: { declinedRequests: pending.length },
    });

    return { declinedRequests: pending.length };
  },
});
