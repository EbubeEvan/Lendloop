import { v } from "convex/values";

import { toolCategoryValidator, toolConditionValidator } from "../../schema";

export const availabilityValidator = v.union(
  v.literal("available"),
  v.literal("reserved"),
  v.literal("on-loan"),
);

export const toolOwnerValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  trustedLender: v.boolean(),
  imageUrl: v.optional(v.string()),
});

export const publicToolValidator = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: toolCategoryValidator,
});

export const toolCardValidator = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: toolCategoryValidator,
  condition: toolConditionValidator,
  description: v.string(),
  owner: toolOwnerValidator,
  isMine: v.boolean(),
  availability: availabilityValidator,
  nextAvailableDate: v.optional(v.string()),
  pendingCount: v.number(),
});
