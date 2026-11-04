import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";

import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const OWNER = {
  subject: "user_owner",
  issuer: "https://test.clerk",
  tokenIdentifier: "https://test.clerk|owner",
  email: "owner@example.com",
  name: "Owner Neighbor",
};

const BORROWER = {
  subject: "user_borrower",
  issuer: "https://test.clerk",
  tokenIdentifier: "https://test.clerk|borrower",
  email: "borrower@example.com",
  name: "Borrower Neighbor",
};

const OTHER = {
  subject: "user_other",
  issuer: "https://test.clerk",
  tokenIdentifier: "https://test.clerk|other",
  email: "other@example.com",
  name: "Other Neighbor",
};

const ADMIN = {
  subject: "user_admin",
  issuer: "https://test.clerk",
  tokenIdentifier: "https://test.clerk|admin",
  email: "admin@example.com",
  name: "Admin Neighbor",
};

function dayFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function provision(t: ReturnType<typeof convexTest>, identity: typeof OWNER) {
  return await t.withIdentity(identity).mutation(api.features.auth.users.store, {});
}

async function seedTool(
  t: ReturnType<typeof convexTest>,
  identity: typeof OWNER,
  name = "Cordless drill",
) {
  return await t.withIdentity(identity).mutation(api.features.tools.mutations.create, {
    name,
    category: "power-tools",
    condition: "good",
    description: "Two batteries and a full bit set. Great for shelves.",
  });
}

describe("Convex RBAC", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  test("roles come from the server allowlist, never the client", async () => {
    const t = convexTest(schema, modules);

    await provision(t, OWNER);
    await provision(t, ADMIN);

    const owner = await t.withIdentity(OWNER).query(api.features.auth.users.me, {});
    const admin = await t.withIdentity(ADMIN).query(api.features.auth.users.me, {});

    expect(owner?.role).toBe("user");
    expect(admin?.role).toBe("admin");
  });

  test("the public board only exposes id, name, and category", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    await seedTool(t, OWNER);

    const publicTools = await t.query(api.features.tools.queries.listPublic, {});

    expect(publicTools).toHaveLength(1);
    expect(Object.keys(publicTools[0] ?? {}).sort()).toEqual(["_id", "category", "name"]);
  });

  test("only the tool owner can approve a request", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    await provision(t, BORROWER);

    const toolId = await seedTool(t, OWNER);
    const requestId = await t
      .withIdentity(BORROWER)
      .mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(1),
        endDate: dayFromNow(3),
      });

    await expect(
      t.withIdentity(BORROWER).mutation(api.features.requests.mutations.approve, { requestId }),
    ).rejects.toThrow(/Only the tool owner/i);

    await t.withIdentity(OWNER).mutation(api.features.requests.mutations.approve, { requestId });
    const request = await t.withIdentity(OWNER).query(api.features.requests.queries.getById, {
      requestId,
    });
    expect(request?.status).toBe("approved");
  });

  test("users cannot request their own tool", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    const toolId = await seedTool(t, OWNER);

    await expect(
      t.withIdentity(OWNER).mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(1),
        endDate: dayFromNow(2),
      }),
    ).rejects.toThrow(/cannot request your own/i);
  });

  test("non-owners cannot remove a listing, admins can", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    await provision(t, OTHER);
    await provision(t, ADMIN);

    const toolId = await seedTool(t, OWNER);

    await expect(
      t.withIdentity(OTHER).mutation(api.features.tools.mutations.remove, { toolId }),
    ).rejects.toThrow(/only remove your own/i);

    await t.withIdentity(ADMIN).mutation(api.features.tools.mutations.remove, { toolId });
    const board = await t.query(api.features.tools.queries.listPublic, {});
    expect(board).toHaveLength(0);
  });

  test("approving one request declines overlapping pending requests", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    await provision(t, BORROWER);
    await provision(t, OTHER);

    const toolId = await seedTool(t, OWNER);
    const first = await t.withIdentity(BORROWER).mutation(api.features.requests.mutations.create, {
      toolId,
      startDate: dayFromNow(2),
      endDate: dayFromNow(4),
    });
    const second = await t.withIdentity(OTHER).mutation(api.features.requests.mutations.create, {
      toolId,
      startDate: dayFromNow(3),
      endDate: dayFromNow(5),
    });

    const result = await t
      .withIdentity(OWNER)
      .mutation(api.features.requests.mutations.approve, { requestId: first });
    expect(result.declinedOverlaps).toBe(1);

    const declined = await t.withIdentity(OTHER).query(api.features.requests.queries.getById, {
      requestId: second,
    });
    expect(declined?.status).toBe("declined");
  });

  test("overlapping approved dates are rejected on create", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    await provision(t, BORROWER);
    await provision(t, OTHER);

    const toolId = await seedTool(t, OWNER);
    const requestId = await t
      .withIdentity(BORROWER)
      .mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(5),
        endDate: dayFromNow(7),
      });
    await t.withIdentity(OWNER).mutation(api.features.requests.mutations.approve, { requestId });

    await expect(
      t.withIdentity(OTHER).mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(6),
        endDate: dayFromNow(8),
      }),
    ).rejects.toThrow(/already booked/i);
  });

  test("only admins can mark a trusted lender", async () => {
    const t = convexTest(schema, modules);
    await provision(t, OWNER);
    await provision(t, ADMIN);
    const ownerId = await provision(t, OWNER);

    await expect(
      t.withIdentity(OWNER).mutation(api.features.admin.mutations.setTrustedLender, {
        userId: ownerId,
        trusted: true,
      }),
    ).rejects.toThrow(/administrator/i);

    await t.withIdentity(ADMIN).mutation(api.features.admin.mutations.setTrustedLender, {
      userId: ownerId,
      trusted: true,
    });
    const me = await t.withIdentity(OWNER).query(api.features.auth.users.me, {});
    expect(me?.trustedLender).toBe(true);
  });
});
