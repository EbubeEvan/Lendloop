import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation } from "../../_generated/server";
import { writeAuditLog } from "../../lib/audit";
import { isAdmin, requireViewer } from "../../lib/auth";
import { rangesOverlap, todayIso } from "../../lib/dates";
import { appError } from "../../lib/errors";
import { LIMITS, validateNote, validateRequestDates } from "../../lib/validation";

type RequestEventType =
  | "request.created"
  | "request.approved"
  | "request.declined"
  | "request.cancelled"
  | "request.returned";

async function scheduleRequestEvent(
  ctx: MutationCtx,
  requestId: Id<"borrowRequests">,
  type: RequestEventType,
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.features.automation.actions.dispatchRequestEvent, {
    requestId,
    type,
  });
}

export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.id("borrowRequests"),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.isRemoved) {
      appError("NOT_FOUND", "That tool is no longer available.");
    }
    if (tool.ownerId === viewer._id) {
      appError("FORBIDDEN", "You cannot request your own tool.");
    }

    validateRequestDates(args.startDate, args.endDate);
    const note = validateNote(args.note);

    const pending = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", viewer._id).eq("status", "pending"))
      .collect();
    if (pending.length >= LIMITS.maxPendingRequests) {
      appError(
        "RATE_LIMITED",
        `You already have ${LIMITS.maxPendingRequests} pending requests. Wait for a response.`,
      );
    }

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower_createdAt", (q) =>
        q.eq("borrowerId", viewer._id).gte("createdAt", dayAgo),
      )
      .collect();
    if (recent.length >= LIMITS.maxRequestsPerDay) {
      appError("RATE_LIMITED", "You have reached the daily request limit. Try again tomorrow.");
    }

    const toolRequests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "approved"))
      .collect();
    if (
      toolRequests.some((request) =>
        rangesOverlap(request.startDate, request.endDate, args.startDate, args.endDate),
      )
    ) {
      appError("CONFLICT", "This tool is already booked for those dates.");
    }

    const myPendingForTool = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
      .collect();
    if (
      myPendingForTool.some(
        (request) =>
          request.borrowerId === viewer._id &&
          rangesOverlap(request.startDate, request.endDate, args.startDate, args.endDate),
      )
    ) {
      appError("CONFLICT", "You already have a pending request for those dates.");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      ownerId: tool.ownerId,
      borrowerId: viewer._id,
      startDate: args.startDate,
      endDate: args.endDate,
      note,
      status: "pending",
      reminderCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleRequestEvent(ctx, requestId, "request.created");
    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "request.created",
      entityType: "borrowRequest",
      entityId: requestId,
      metadata: { toolId: tool._id },
    });

    return requestId;
  },
});

export const approve = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.object({ declinedOverlaps: v.number() }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      appError("NOT_FOUND", "That request no longer exists.");
    }
    if (request.ownerId !== viewer._id) {
      appError("FORBIDDEN", "Only the tool owner can approve requests.");
    }
    if (request.status !== "pending") {
      appError("CONFLICT", "Only pending requests can be approved.");
    }

    const tool = await ctx.db.get(request.toolId);
    if (!tool || tool.isRemoved) {
      appError("CONFLICT", "This listing was removed. Decline the request instead.");
    }

    const approved = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", request.toolId).eq("status", "approved"))
      .collect();
    if (
      approved.some((other) =>
        rangesOverlap(other.startDate, other.endDate, request.startDate, request.endDate),
      )
    ) {
      appError("CONFLICT", "Another approved loan already covers those dates.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "approved",
      respondedAt: now,
      updatedAt: now,
    });

    const pending = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", request.toolId).eq("status", "pending"))
      .collect();
    const conflicts = pending.filter(
      (other) =>
        other._id !== request._id &&
        rangesOverlap(other.startDate, other.endDate, request.startDate, request.endDate),
    );
    for (const conflict of conflicts) {
      await ctx.db.patch(conflict._id, {
        status: "declined",
        respondedAt: now,
        updatedAt: now,
      });
      await scheduleRequestEvent(ctx, conflict._id, "request.declined");
    }

    await scheduleRequestEvent(ctx, request._id, "request.approved");
    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "request.approved",
      entityType: "borrowRequest",
      entityId: request._id,
      metadata: { declinedOverlaps: conflicts.length },
    });

    return { declinedOverlaps: conflicts.length };
  },
});

export const decline = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      appError("NOT_FOUND", "That request no longer exists.");
    }
    if (request.ownerId !== viewer._id) {
      appError("FORBIDDEN", "Only the tool owner can decline requests.");
    }
    if (request.status !== "pending") {
      appError("CONFLICT", "Only pending requests can be declined.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "declined",
      respondedAt: now,
      updatedAt: now,
    });
    await scheduleRequestEvent(ctx, request._id, "request.declined");
    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "request.declined",
      entityType: "borrowRequest",
      entityId: request._id,
    });

    return null;
  },
});

export const cancel = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      appError("NOT_FOUND", "That request no longer exists.");
    }
    if (request.borrowerId !== viewer._id) {
      appError("FORBIDDEN", "Only the borrower can cancel this request.");
    }
    if (request.status !== "pending") {
      appError("CONFLICT", "Only pending requests can be cancelled.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "cancelled",
      respondedAt: now,
      updatedAt: now,
    });
    await scheduleRequestEvent(ctx, request._id, "request.cancelled");
    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "request.cancelled",
      entityType: "borrowRequest",
      entityId: request._id,
    });

    return null;
  },
});

export const markReturned = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      appError("NOT_FOUND", "That request no longer exists.");
    }
    if (request.ownerId !== viewer._id && request.borrowerId !== viewer._id && !isAdmin(viewer)) {
      appError("FORBIDDEN", "Only the lender or borrower can close this loan.");
    }
    if (request.status !== "approved") {
      appError("CONFLICT", "Only an active loan can be marked as returned.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "returned",
      returnedAt: now,
      returnedById: viewer._id,
      updatedAt: now,
    });
    await scheduleRequestEvent(ctx, request._id, "request.returned");
    await writeAuditLog(ctx, {
      actorId: viewer._id,
      action: "request.returned",
      entityType: "borrowRequest",
      entityId: request._id,
      metadata: { today: todayIso(now) },
    });

    return null;
  },
});
