import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const fetchQuery = vi.fn();
vi.mock("convex/nextjs", () => ({ fetchQuery: (...args: unknown[]) => fetchQuery(...args) }));

const { isAdminRequest } = await import("@/lib/admin-access");

function clerkAuth(token: string | null | Error, aud?: string) {
  const getToken = vi.fn(async () => {
    if (token instanceof Error) throw token;
    return token;
  });
  return { sessionClaims: aud ? { aud } : {}, getToken };
}

describe("isAdminRequest", () => {
  beforeEach(() => {
    fetchQuery.mockReset();
  });

  test("uses the `convex` JWT template by default and allows admins", async () => {
    fetchQuery.mockResolvedValue(true);
    const auth = clerkAuth("jwt");

    await expect(isAdminRequest(auth)).resolves.toBe(true);
    expect(auth.getToken).toHaveBeenCalledWith({ template: "convex" });
    expect(fetchQuery.mock.calls[0][2]).toMatchObject({ token: "jwt" });
  });

  test("uses the session token itself with Clerk's native Convex integration", async () => {
    fetchQuery.mockResolvedValue(true);
    const auth = clerkAuth("session-jwt", "convex");

    await expect(isAdminRequest(auth)).resolves.toBe(true);
    expect(auth.getToken).toHaveBeenCalledWith();
    expect(fetchQuery.mock.calls[0][2]).toMatchObject({ token: "session-jwt" });
  });

  test("denies when Convex says the caller is not an admin", async () => {
    fetchQuery.mockResolvedValue(false);
    await expect(isAdminRequest(clerkAuth("jwt"))).resolves.toBe(false);
  });

  test("denies without a token and never calls Convex", async () => {
    await expect(isAdminRequest(clerkAuth(null))).resolves.toBe(false);
    expect(fetchQuery).not.toHaveBeenCalled();
  });

  test("fails closed when Convex or Clerk errors", async () => {
    fetchQuery.mockRejectedValue(new Error("Convex unavailable"));
    await expect(isAdminRequest(clerkAuth("jwt"))).resolves.toBe(false);
    await expect(isAdminRequest(clerkAuth(new Error("Clerk down")))).resolves.toBe(false);
  });
});
