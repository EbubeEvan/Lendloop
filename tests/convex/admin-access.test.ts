import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";

import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const ADMIN = {
  subject: "user_admin",
  issuer: "https://test.clerk",
  tokenIdentifier: "https://test.clerk|admin",
  email: "Admin@Example.com",
  name: "Admin Neighbor",
};

const NEIGHBOR = {
  subject: "user_neighbor",
  issuer: "https://test.clerk",
  tokenIdentifier: "https://test.clerk|neighbor",
  email: "neighbor@example.com",
  name: "Regular Neighbor",
};

describe("canAccessAdmin (used by the /admin proxy check)", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  test("signed-out callers are denied", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.features.auth.users.canAccessAdmin, {})).toBe(false);
  });

  test("an allowlisted admin is let in on the very first visit, before `store` has run", async () => {
    const t = convexTest(schema, modules);
    const admin = t.withIdentity(ADMIN);

    const users = await t.run(async (ctx) => await ctx.db.query("users").collect());
    expect(users).toHaveLength(0);
    expect(await admin.query(api.features.auth.users.canAccessAdmin, {})).toBe(true);

    // The answer matches the role `store` then writes, so the page renders for them.
    await admin.mutation(api.features.auth.users.store, {});
    expect((await admin.query(api.features.auth.users.me, {}))?.role).toBe("admin");
    expect(await admin.query(api.features.auth.users.canAccessAdmin, {})).toBe(true);
  });

  test("a regular user is denied both before and after provisioning", async () => {
    const t = convexTest(schema, modules);
    const neighbor = t.withIdentity(NEIGHBOR);

    expect(await neighbor.query(api.features.auth.users.canAccessAdmin, {})).toBe(false);
    await neighbor.mutation(api.features.auth.users.store, {});
    expect(await neighbor.query(api.features.auth.users.canAccessAdmin, {})).toBe(false);
  });

  test("once provisioned, the stored role wins over the allowlist", async () => {
    const t = convexTest(schema, modules);
    const neighbor = t.withIdentity(NEIGHBOR);
    await neighbor.mutation(api.features.auth.users.store, {});

    // Adding the email to the allowlist alone does not grant access until
    // `store` runs again and promotes the stored role.
    process.env.ADMIN_EMAILS = "admin@example.com,neighbor@example.com";
    expect(await neighbor.query(api.features.auth.users.canAccessAdmin, {})).toBe(false);

    await neighbor.mutation(api.features.auth.users.store, {});
    expect(await neighbor.query(api.features.auth.users.canAccessAdmin, {})).toBe(true);
  });

  test("an identity without an email claim is denied", async () => {
    const t = convexTest(schema, modules);
    const { email: _email, ...noEmail } = NEIGHBOR;
    expect(await t.withIdentity(noEmail).query(api.features.auth.users.canAccessAdmin, {})).toBe(
      false,
    );
  });

  test("provisioning without an email explains which claims arrived, without their values", async () => {
    const t = convexTest(schema, modules);
    const { email: _email, ...noEmail } = NEIGHBOR;
    const attempt = t.withIdentity(noEmail).mutation(api.features.auth.users.store, {});

    await expect(attempt).rejects.toThrow(/Claims received: .*name.*subject/);
    await expect(attempt).rejects.not.toThrow(/Regular Neighbor/);
  });
});
