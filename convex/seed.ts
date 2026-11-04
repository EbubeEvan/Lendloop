import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { addDaysIso, todayIso } from "./lib/dates";
import { appError } from "./lib/errors";

/**
 * Local-only demo data. Enable with ALLOW_DEV_SEED=true in the Convex
 * deployment environment. Never enable this in production.
 */
export const seedDemoTools = internalMutation({
  args: {
    ownerEmail: v.optional(v.string()),
  },
  returns: v.object({ tools: v.number(), requests: v.number() }),
  handler: async (ctx, args) => {
    if (process.env.ALLOW_DEV_SEED !== "true") {
      appError("FORBIDDEN", "Seeding is disabled. Set ALLOW_DEV_SEED=true to enable it.");
    }
    const owner = args.ownerEmail
      ? await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", args.ownerEmail!.trim().toLowerCase()))
          .unique()
      : await ctx.db.query("users").first();

    if (!owner) {
      appError(
        "NOT_FOUND",
        args.ownerEmail
          ? "No neighbor with that email has signed in yet."
          : "Sign in once before seeding so the demo tools have an owner.",
      );
    }

    const existing = await ctx.db.query("tools").collect();
    if (existing.length > 0) {
      return { tools: 0, requests: 0 };
    }

    const now = Date.now();
    let neighbor = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "neighbor@lendloop.local"))
      .unique();
    if (!neighbor) {
      const neighborId = await ctx.db.insert("users", {
        clerkId: "seed_neighbor",
        tokenIdentifier: "seed|neighbor",
        email: "neighbor@lendloop.local",
        name: "Maya Chen",
        role: "user",
        trustedLender: true,
        createdAt: now,
        updatedAt: now,
      });
      neighbor = await ctx.db.get(neighborId);
    }
    if (!neighbor) {
      appError("INTERNAL", "Could not create the demo neighbor.");
    }

    const toolIds: Record<string, Id<"tools">> = {};
    const sampleTools = [
      {
        ownerId: owner._id,
        name: "DeWalt 20V cordless drill",
        category: "power-tools" as const,
        condition: "good" as const,
        description:
          "Two batteries, charger, and a full bit set. Great for shelves and furniture assembly.",
      },
      {
        ownerId: owner._id,
        name: "Extension ladder (16 ft)",
        category: "hand-tools" as const,
        condition: "like-new" as const,
        description: "Aluminium ladder, rated to 300 lb. Folds down for easy transport.",
      },
      {
        ownerId: owner._id,
        name: "Cast iron skillet",
        category: "kitchen" as const,
        condition: "well-loved" as const,
        description: "12-inch skillet, seasoned and ready. Please hand wash and re-oil.",
      },
      {
        ownerId: owner._id,
        name: "Two-person camping tent",
        category: "camping" as const,
        condition: "good" as const,
        description: "Three-season tent with footprint and rain fly. Sleeps two comfortably.",
      },
      {
        ownerId: neighbor._id,
        name: "Cordless leaf blower",
        category: "garden" as const,
        condition: "good" as const,
        description: "Lightweight blower with one battery. Perfect for patios and driveways.",
      },
      {
        ownerId: neighbor._id,
        name: "Garden tiller",
        category: "garden" as const,
        condition: "fair" as const,
        description: "Electric tiller for small beds. Works well, a little noisy.",
      },
      {
        ownerId: neighbor._id,
        name: "Stand mixer",
        category: "kitchen" as const,
        condition: "like-new" as const,
        description: "Five-quart mixer with whisk, paddle, and dough hook.",
      },
    ];

    for (const tool of sampleTools) {
      const id = await ctx.db.insert("tools", {
        ...tool,
        isRemoved: false,
        createdAt: now,
        updatedAt: now,
      });
      toolIds[tool.name] = id;
    }

    const today = todayIso();
    const pendingToolId = toolIds["DeWalt 20V cordless drill"];
    const overdueToolId = toolIds["Two-person camping tent"];

    let requests = 0;
    if (pendingToolId) {
      await ctx.db.insert("borrowRequests", {
        toolId: pendingToolId,
        ownerId: owner._id,
        borrowerId: neighbor._id,
        startDate: addDaysIso(today, 2),
        endDate: addDaysIso(today, 4),
        note: "Building a bookshelf this weekend — would love to borrow the drill.",
        status: "pending",
        reminderCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      requests += 1;
    }

    if (overdueToolId) {
      await ctx.db.insert("borrowRequests", {
        toolId: overdueToolId,
        ownerId: owner._id,
        borrowerId: neighbor._id,
        startDate: addDaysIso(today, -5),
        endDate: addDaysIso(today, -2),
        status: "approved",
        reminderCount: 1,
        lastRemindedOn: addDaysIso(today, -1),
        respondedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      requests += 1;
    }

    return { tools: sampleTools.length, requests };
  },
});
