import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { requireViewer } from "../../lib/auth";
import { enrichRequests, requestCardValidator } from "../../lib/requestQueries";

export const listMine = query({
  args: {},
  returns: v.array(requestCardValidator),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);

    const [asOwner, asBorrower] = await Promise.all([
      ctx.db
        .query("borrowRequests")
        .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
        .collect(),
      ctx.db
        .query("borrowRequests")
        .withIndex("by_borrower", (q) => q.eq("borrowerId", viewer._id))
        .collect(),
    ]);

    const seen = new Set<Id<"borrowRequests">>();
    const loans = [...asOwner, ...asBorrower].filter((request) => {
      if (seen.has(request._id)) {
        return false;
      }
      seen.add(request._id);
      return request.status === "approved" || request.status === "returned";
    });

    const cards = await enrichRequests(ctx, loans, viewer);
    const rank = (card: (typeof cards)[number]): number => {
      if (card.status === "approved" && card.isOverdue) return 0;
      if (card.status === "approved") return 1;
      return 2;
    };

    return cards.sort((a, b) => rank(a) - rank(b) || b.endDate.localeCompare(a.endDate));
  },
});
