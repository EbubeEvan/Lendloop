import { v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { query } from "../../_generated/server";
import { getViewer, requireViewer } from "../../lib/auth";
import { addDaysIso, todayIso } from "../../lib/dates";
import { toolCategoryValidator } from "../../schema";
import { publicToolValidator, toolCardValidator } from "./validators";

type Tool = Doc<"tools">;
type Request = Doc<"borrowRequests">;

type AvailabilityState = {
  availability: "available" | "reserved" | "on-loan";
  nextAvailableDate?: string;
};

export function deriveAvailability(
  toolId: Id<"tools">,
  approvedRequests: Request[],
  today: string,
): AvailabilityState {
  const relevant = approvedRequests.filter((request) => request.toolId === toolId);
  const active = relevant.filter(
    (request) => request.startDate <= today && request.endDate >= today,
  );
  if (active.length > 0) {
    const latestEnd = active.reduce(
      (latest, request) => (request.endDate > latest ? request.endDate : latest),
      active[0]?.endDate ?? today,
    );
    return { availability: "on-loan", nextAvailableDate: addDaysIso(latestEnd, 1) };
  }

  const upcoming = relevant
    .filter((request) => request.startDate > today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  if (upcoming.length > 0 && upcoming[0]) {
    return { availability: "reserved", nextAvailableDate: upcoming[0].startDate };
  }

  return { availability: "available" };
}

async function loadApprovedForTools(ctx: QueryCtx, toolIds: Id<"tools">[]): Promise<Request[]> {
  const perTool = await Promise.all(
    toolIds.map((toolId) =>
      ctx.db
        .query("borrowRequests")
        .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
        .collect(),
    ),
  );
  return perTool.flat();
}

async function loadOwners(ctx: QueryCtx, tools: Tool[]): Promise<Map<Id<"users">, Doc<"users">>> {
  const uniqueIds = [...new Set(tools.map((tool) => tool.ownerId))];
  const owners = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
  const map = new Map<Id<"users">, Doc<"users">>();
  owners.forEach((owner) => {
    if (owner) {
      map.set(owner._id, owner);
    }
  });
  return map;
}

async function loadPendingCounts(ctx: QueryCtx, tools: Tool[]): Promise<Map<Id<"tools">, number>> {
  const counts = await Promise.all(
    tools.map(async (tool) => {
      const pending = await ctx.db
        .query("borrowRequests")
        .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
        .collect();
      return [tool._id, pending.length] as const;
    }),
  );
  return new Map(counts);
}

function toCard(
  tool: Tool,
  viewerId: Id<"users">,
  approved: Request[],
  owners: Map<Id<"users">, Doc<"users">>,
  pendingCounts: Map<Id<"tools">, number>,
) {
  const owner = owners.get(tool.ownerId);
  if (!owner) {
    return null;
  }
  const availability = deriveAvailability(tool._id, approved, todayIso());

  return {
    _id: tool._id,
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
    owner: {
      _id: owner._id,
      name: owner.name,
      trustedLender: owner.trustedLender,
      imageUrl: owner.imageUrl,
    },
    isMine: owner._id === viewerId,
    availability: availability.availability,
    nextAvailableDate: availability.nextAvailableDate,
    pendingCount: pendingCounts.get(tool._id) ?? 0,
  };
}

/** Unauthenticated, deliberately minimal projection: name + category only. */
export const listPublic = query({
  args: {},
  returns: v.array(publicToolValidator),
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_active", (q) => q.eq("isRemoved", false))
      .take(60);

    return tools
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tool) => ({ _id: tool._id, name: tool.name, category: tool.category }));
  },
});

export const listBrowse = query({
  args: { category: v.optional(toolCategoryValidator) },
  returns: v.array(toolCardValidator),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);

    const tools = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_active", (q) => q.eq("isRemoved", false).eq("category", args.category!))
          .take(120)
      : await ctx.db
          .query("tools")
          .withIndex("by_active", (q) => q.eq("isRemoved", false))
          .take(120);

    const [approved, owners, pendingCounts] = await Promise.all([
      loadApprovedForTools(
        ctx,
        tools.map((tool) => tool._id),
      ),
      loadOwners(ctx, tools),
      loadPendingCounts(ctx, tools),
    ]);

    const cards = tools.map((tool) => toCard(tool, viewer._id, approved, owners, pendingCounts));

    return cards
      .filter((card): card is NonNullable<typeof card> => card !== null)
      .sort((a, b) => Number(a.isMine) - Number(b.isMine) || a.name.localeCompare(b.name));
  },
});

export const listMine = query({
  args: {},
  returns: v.array(toolCardValidator),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
      .collect();

    const active = tools.filter((tool) => !tool.isRemoved);
    const [approved, owners, pendingCounts] = await Promise.all([
      loadApprovedForTools(
        ctx,
        active.map((tool) => tool._id),
      ),
      loadOwners(ctx, active),
      loadPendingCounts(ctx, active),
    ]);

    const cards = active.map((tool) => toCard(tool, viewer._id, approved, owners, pendingCounts));

    return cards
      .filter((card): card is NonNullable<typeof card> => card !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getById = query({
  args: { toolId: v.id("tools") },
  returns: v.union(toolCardValidator, v.null()),
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.isRemoved) {
      return null;
    }

    const [approved, owners, pendingCounts] = await Promise.all([
      loadApprovedForTools(ctx, [tool._id]),
      loadOwners(ctx, [tool]),
      loadPendingCounts(ctx, [tool]),
    ]);

    return toCard(tool, viewer._id, approved, owners, pendingCounts);
  },
});
