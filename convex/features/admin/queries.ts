import { v } from "convex/values";

import { query } from "../../_generated/server";
import { requireAdmin, requireViewer } from "../../lib/auth";
import { todayIso } from "../../lib/dates";
import { enrichRequests, requestCardValidator } from "../../lib/requestQueries";

export const overview = query({
  args: {},
  returns: v.object({
    users: v.number(),
    activeTools: v.number(),
    pendingRequests: v.number(),
    activeLoans: v.number(),
    overdueLoans: v.number(),
    failedAutomations: v.number(),
  }),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireAdmin(viewer);

    const [users, tools, requests, events] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("tools").collect(),
      ctx.db.query("borrowRequests").collect(),
      ctx.db.query("automationEvents").collect(),
    ]);

    const today = todayIso();
    return {
      users: users.length,
      activeTools: tools.filter((tool) => !tool.isRemoved).length,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
      activeLoans: requests.filter((request) => request.status === "approved").length,
      overdueLoans: requests.filter(
        (request) => request.status === "approved" && request.endDate < today,
      ).length,
      failedAutomations: events.filter((event) => event.status === "failed").length,
    };
  },
});

export const listLoans = query({
  args: {},
  returns: v.array(requestCardValidator),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireAdmin(viewer);

    const requests = await ctx.db.query("borrowRequests").withIndex("by_createdAt").collect();
    const loans = requests.filter(
      (request) => request.status === "approved" || request.status === "returned",
    );
    return await enrichRequests(ctx, loans, viewer);
  },
});

export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: v.union(v.literal("user"), v.literal("admin")),
      trustedLender: v.boolean(),
      imageUrl: v.optional(v.string()),
      toolCount: v.number(),
      loanCount: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireAdmin(viewer);

    const users = await ctx.db.query("users").collect();
    const rows = await Promise.all(
      users.map(async (user) => {
        const [tools, asOwner, asBorrower] = await Promise.all([
          ctx.db
            .query("tools")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect(),
          ctx.db
            .query("borrowRequests")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .collect(),
          ctx.db
            .query("borrowRequests")
            .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
            .collect(),
        ]);
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          trustedLender: user.trustedLender,
          imageUrl: user.imageUrl,
          toolCount: tools.filter((tool) => !tool.isRemoved).length,
          loanCount: [...asOwner, ...asBorrower].filter(
            (request) => request.status === "approved" || request.status === "returned",
          ).length,
          createdAt: user.createdAt,
        };
      }),
    );

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listAuditLogs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("auditLogs"),
      action: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      metadata: v.optional(v.string()),
      actorName: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    requireAdmin(viewer);

    const logs = await ctx.db.query("auditLogs").withIndex("by_createdAt").order("desc").take(100);
    const actorIds = [...new Set(logs.map((log) => log.actorId))];
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get(id)));
    const names = new Map(
      actors.filter((actor) => actor !== null).map((actor) => [actor._id, actor.name]),
    );

    return logs.map((log) => ({
      _id: log._id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      actorName: names.get(log.actorId) ?? "Unknown",
      createdAt: log.createdAt,
    }));
  },
});
