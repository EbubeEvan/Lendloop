import { v } from "convex/values";

import { query } from "../../_generated/server";
import { isAdmin, requireViewer } from "../../lib/auth";
import {
  automationChannelValidator,
  automationStatusValidator,
  automationTypeValidator,
} from "../../schema";

export const automationEventValidator = v.object({
  _id: v.id("automationEvents"),
  requestId: v.optional(v.id("borrowRequests")),
  type: automationTypeValidator,
  channel: automationChannelValidator,
  status: automationStatusValidator,
  detail: v.optional(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
});

export const recentForRequest = query({
  args: { requestId: v.id("borrowRequests") },
  returns: v.array(automationEventValidator),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return [];
    }
    if (request.ownerId !== viewer._id && request.borrowerId !== viewer._id && !isAdmin(viewer)) {
      return [];
    }

    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .order("desc")
      .take(20);

    return events.map((event) => ({
      _id: event._id,
      requestId: event.requestId,
      type: event.type,
      channel: event.channel,
      status: event.status,
      detail: event.detail,
      error: event.error,
      createdAt: event.createdAt,
    }));
  },
});

export const recent = query({
  args: {},
  returns: v.array(automationEventValidator),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    if (!isAdmin(viewer)) {
      return [];
    }

    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .take(100);

    return events.map((event) => ({
      _id: event._id,
      requestId: event.requestId,
      type: event.type,
      channel: event.channel,
      status: event.status,
      detail: event.detail,
      error: event.error,
      createdAt: event.createdAt,
    }));
  },
});
