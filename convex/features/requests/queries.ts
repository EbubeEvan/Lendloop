import { v } from "convex/values";

import { query } from "../../_generated/server";
import { isAdmin, requireViewer } from "../../lib/auth";
import { enrichRequests, requestCardValidator } from "../../lib/requestQueries";

export const listMine = query({
  args: {},
  returns: v.array(requestCardValidator),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", viewer._id))
      .collect();
    return await enrichRequests(ctx, requests, viewer);
  },
});

export const listIncoming = query({
  args: {},
  returns: v.array(requestCardValidator),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
      .collect();
    return await enrichRequests(ctx, requests, viewer);
  },
});

export const getById = query({
  args: { requestId: v.id("borrowRequests") },
  returns: v.union(requestCardValidator, v.null()),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }
    if (request.ownerId !== viewer._id && request.borrowerId !== viewer._id && !isAdmin(viewer)) {
      return null;
    }
    const [card] = await enrichRequests(ctx, [request], viewer);
    return card ?? null;
  },
});
