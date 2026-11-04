import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Party } from "./requests";
import { buildRequestCard, type RequestCard } from "./requests";

export const partyValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  trustedLender: v.boolean(),
  imageUrl: v.optional(v.string()),
});

export const requestCardValidator = v.object({
  _id: v.id("borrowRequests"),
  tool: v.object({
    _id: v.id("tools"),
    name: v.string(),
    category: v.union(
      v.literal("power-tools"),
      v.literal("hand-tools"),
      v.literal("garden"),
      v.literal("kitchen"),
      v.literal("camping"),
      v.literal("other"),
    ),
    condition: v.union(
      v.literal("new"),
      v.literal("like-new"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("well-loved"),
    ),
    description: v.string(),
    isRemoved: v.boolean(),
  }),
  owner: partyValidator,
  borrower: partyValidator,
  startDate: v.string(),
  endDate: v.string(),
  note: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("declined"),
    v.literal("cancelled"),
    v.literal("returned"),
  ),
  viewerRole: v.union(v.literal("borrower"), v.literal("lender"), v.literal("admin")),
  isOverdue: v.boolean(),
  canApprove: v.boolean(),
  canDecline: v.boolean(),
  canCancel: v.boolean(),
  canReturn: v.boolean(),
  reminderCount: v.number(),
  lastRemindedOn: v.optional(v.string()),
  createdAt: v.number(),
  respondedAt: v.optional(v.number()),
  returnedAt: v.optional(v.number()),
});

export async function enrichRequests(
  ctx: QueryCtx,
  requests: Doc<"borrowRequests">[],
  viewer: Doc<"users">,
): Promise<RequestCard[]> {
  const toolIds = [...new Set(requests.map((request) => request.toolId))];
  const userIds = [
    ...new Set(requests.flatMap((request) => [request.ownerId, request.borrowerId])),
  ];

  const [tools, users] = await Promise.all([
    Promise.all(toolIds.map((id) => ctx.db.get(id))),
    Promise.all(userIds.map((id) => ctx.db.get(id))),
  ]);

  const toolMap = new Map<Id<"tools">, Doc<"tools">>();
  tools.forEach((tool) => {
    if (tool) {
      toolMap.set(tool._id, tool);
    }
  });
  const userMap = new Map<Id<"users">, Doc<"users">>();
  users.forEach((user) => {
    if (user) {
      userMap.set(user._id, user);
    }
  });

  const cards: RequestCard[] = [];
  for (const request of requests) {
    const tool = toolMap.get(request.toolId);
    const owner = userMap.get(request.ownerId);
    const borrower = userMap.get(request.borrowerId);
    if (!tool || !owner || !borrower) {
      continue;
    }
    cards.push(
      buildRequestCard({
        request,
        tool,
        owner,
        borrower,
        viewerId: viewer._id,
        viewerIsAdmin: viewer.role === "admin",
      }),
    );
  }

  return cards.sort((a, b) => b.createdAt - a.createdAt);
}

export type { Party };
