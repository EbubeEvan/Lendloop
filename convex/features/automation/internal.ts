import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import { todayIso } from "../../lib/dates";
import { env } from "../../lib/env";
import { appError } from "../../lib/errors";
import { reminderIdempotencyKey } from "../../lib/hmac";
import {
  automationChannelValidator,
  automationStatusValidator,
  automationTypeValidator,
  requestStatusValidator,
} from "../../schema";

function recipientFor(
  type: Doc<"automationEvents">["type"],
  owner: Doc<"users">,
  borrower: Doc<"users">,
  returnedById: Doc<"borrowRequests">["returnedById"],
): Doc<"users"> {
  switch (type) {
    case "request.created":
    case "request.cancelled":
      return owner;
    case "request.approved":
    case "request.declined":
      return borrower;
    case "request.returned":
      return returnedById === owner._id ? borrower : owner;
    case "reminder.sent":
    case "workflow.failed":
      return borrower;
  }
}

/**
 * Claims an incoming webhook event id. Call this inside the same mutation as
 * the write it protects: if the write throws, the claim rolls back with it, so
 * a retry from n8n is processed instead of being acknowledged as a duplicate.
 */
async function claimReplayKey(ctx: MutationCtx, key: string): Promise<boolean> {
  const existing = await ctx.db
    .query("webhookReplay")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) {
    return false;
  }
  await ctx.db.insert("webhookReplay", { key, createdAt: Date.now() });
  return true;
}

export const getNotificationContext = internalQuery({
  args: {
    requestId: v.id("borrowRequests"),
    type: automationTypeValidator,
  },
  returns: v.union(
    v.object({
      requestId: v.id("borrowRequests"),
      type: automationTypeValidator,
      updatedAt: v.number(),
      status: requestStatusValidator,
      toolName: v.string(),
      category: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      recipient: v.object({
        name: v.string(),
        email: v.string(),
      }),
      counterpartName: v.string(),
      appUrl: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }
    const [tool, owner, borrower] = await Promise.all([
      ctx.db.get(request.toolId),
      ctx.db.get(request.ownerId),
      ctx.db.get(request.borrowerId),
    ]);
    if (!tool || !owner || !borrower) {
      return null;
    }

    const recipient = recipientFor(args.type, owner, borrower, request.returnedById);
    const counterpart = recipient._id === owner._id ? borrower : owner;
    const appUrl = env.appUrl();

    return {
      requestId: request._id,
      type: args.type,
      updatedAt: request.updatedAt,
      status: request.status,
      toolName: tool.name,
      category: tool.category,
      startDate: request.startDate,
      endDate: request.endDate,
      recipient: { name: recipient.name, email: recipient.email },
      counterpartName: counterpart.name,
      appUrl,
    };
  },
});

export const eventExists = internalQuery({
  args: { idempotencyKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();
    return existing !== null;
  },
});

export const recordDispatchResult = internalMutation({
  args: {
    requestId: v.id("borrowRequests"),
    type: automationTypeValidator,
    status: automationStatusValidator,
    idempotencyKey: v.string(),
    detail: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();
    if (existing) {
      return null;
    }

    const request = await ctx.db.get(args.requestId);
    await ctx.db.insert("automationEvents", {
      requestId: args.requestId,
      toolId: request?.toolId,
      type: args.type,
      channel: "email",
      status: args.status,
      idempotencyKey: args.idempotencyKey,
      detail: args.detail,
      error: args.error,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const overdueLoans = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      requestId: v.id("borrowRequests"),
      toolName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      borrowerName: v.string(),
      borrowerEmail: v.string(),
      reminderCount: v.number(),
      lastRemindedOn: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const today = todayIso();
    const overdue = await ctx.db
      .query("borrowRequests")
      .withIndex("by_status_endDate", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(100);

    const rows = await Promise.all(
      overdue.map(async (request) => {
        const [tool, borrower] = await Promise.all([
          ctx.db.get(request.toolId),
          ctx.db.get(request.borrowerId),
        ]);
        if (!tool || !borrower) {
          return null;
        }
        return {
          requestId: request._id,
          toolName: tool.name,
          startDate: request.startDate,
          endDate: request.endDate,
          borrowerName: borrower.name,
          borrowerEmail: borrower.email,
          reminderCount: request.reminderCount,
          lastRemindedOn: request.lastRemindedOn,
        };
      }),
    );

    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  },
});

export const recordReminder = internalMutation({
  args: {
    requestId: v.id("borrowRequests"),
    channel: automationChannelValidator,
    sentAt: v.number(),
    replayKey: v.string(),
  },
  returns: v.object({
    duplicate: v.boolean(),
    skipped: v.boolean(),
    reason: v.optional(v.string()),
    idempotencyKey: v.string(),
  }),
  handler: async (ctx, args) => {
    const day = todayIso(args.sentAt);
    const key = reminderIdempotencyKey(args.requestId, day);

    if (!(await claimReplayKey(ctx, args.replayKey))) {
      return { duplicate: true, skipped: false, idempotencyKey: key };
    }

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
      .first();
    if (existing) {
      return { duplicate: true, skipped: false, idempotencyKey: key };
    }

    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "approved") {
      return {
        duplicate: false,
        skipped: true,
        reason: "Loan is no longer active.",
        idempotencyKey: key,
      };
    }
    if (request.endDate >= day) {
      return {
        duplicate: false,
        skipped: true,
        reason: "Loan is not overdue.",
        idempotencyKey: key,
      };
    }

    await ctx.db.insert("automationEvents", {
      requestId: request._id,
      toolId: request.toolId,
      type: "reminder.sent",
      channel: args.channel,
      status: "sent",
      idempotencyKey: key,
      detail: `Overdue reminder sent for ${request.endDate}`,
      createdAt: Date.now(),
    });
    await ctx.db.patch(request._id, {
      lastRemindedOn: day,
      reminderCount: request.reminderCount + 1,
      updatedAt: Date.now(),
    });

    return { duplicate: false, skipped: false, idempotencyKey: key };
  },
});

export const recordFailure = internalMutation({
  args: {
    requestId: v.optional(v.id("borrowRequests")),
    workflow: v.string(),
    executionId: v.optional(v.string()),
    node: v.optional(v.string()),
    message: v.string(),
    replayKey: v.string(),
  },
  returns: v.object({ duplicate: v.boolean() }),
  handler: async (ctx, args) => {
    if (!(await claimReplayKey(ctx, args.replayKey))) {
      return { duplicate: true };
    }
    const key = `failure:${args.workflow}:${args.executionId ?? args.message}`;
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
      .first();
    if (existing) {
      return { duplicate: true };
    }

    const request = args.requestId ? await ctx.db.get(args.requestId) : null;
    await ctx.db.insert("automationEvents", {
      requestId: args.requestId,
      toolId: request?.toolId,
      type: "workflow.failed",
      channel: "system",
      status: "failed",
      idempotencyKey: key,
      detail: `n8n workflow "${args.workflow}" failed${args.node ? ` at ${args.node}` : ""}`,
      error: args.message,
      createdAt: Date.now(),
    });
    return { duplicate: false };
  },
});

export const cleanupReplayKeys = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = await ctx.db
      .query("webhookReplay")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(500);
    await Promise.all(stale.map((entry) => ctx.db.delete(entry._id)));
    return stale.length;
  },
});

export const getRequestForFailure = internalQuery({
  args: { requestId: v.id("borrowRequests") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      appError("NOT_FOUND", "Request not found.");
    }
    return true;
  },
});
