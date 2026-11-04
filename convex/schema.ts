import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const toolCategoryValidator = v.union(
  v.literal("power-tools"),
  v.literal("hand-tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("other"),
);

export const toolConditionValidator = v.union(
  v.literal("new"),
  v.literal("like-new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("well-loved"),
);

export const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

export const roleValidator = v.union(v.literal("user"), v.literal("admin"));

export const automationTypeValidator = v.union(
  v.literal("request.created"),
  v.literal("request.approved"),
  v.literal("request.declined"),
  v.literal("request.cancelled"),
  v.literal("request.returned"),
  v.literal("reminder.sent"),
  v.literal("workflow.failed"),
);

export const automationChannelValidator = v.union(
  v.literal("email"),
  v.literal("slack"),
  v.literal("discord"),
  v.literal("mock"),
  v.literal("system"),
);

export const automationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("skipped"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: roleValidator,
    trustedLender: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
    isRemoved: v.boolean(),
    removedAt: v.optional(v.number()),
    removedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_active", ["isRemoved", "category"])
    .index("by_category", ["category"]),

  borrowRequests: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    note: v.optional(v.string()),
    status: requestStatusValidator,
    respondedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
    returnedById: v.optional(v.id("users")),
    lastRemindedOn: v.optional(v.string()),
    reminderCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId", "status"])
    .index("by_borrower_createdAt", ["borrowerId", "createdAt"])
    .index("by_owner", ["ownerId", "status"])
    .index("by_status_endDate", ["status", "endDate"])
    .index("by_createdAt", ["createdAt"]),

  automationEvents: defineTable({
    requestId: v.optional(v.id("borrowRequests")),
    toolId: v.optional(v.id("tools")),
    type: automationTypeValidator,
    channel: automationChannelValidator,
    status: automationStatusValidator,
    idempotencyKey: v.optional(v.string()),
    detail: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId", "createdAt"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_status", ["status", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_actor", ["actorId"]),

  webhookReplay: defineTable({
    key: v.string(),
    createdAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_createdAt", ["createdAt"]),
});
