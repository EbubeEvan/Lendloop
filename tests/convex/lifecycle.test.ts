import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { buildSignature, verifySignature } from "../../convex/lib/hmac";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const OUTGOING_SECRET = "convex-to-n8n-test-secret";
const INCOMING_SECRET = "n8n-to-convex-test-secret";
const WEBHOOK_URL = "http://n8n.test/webhook/lendloop/request-events";

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

type Captured = { url: string; headers: Record<string, string>; body: string };

function dayFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function setup() {
  const t = convexTest(schema, modules);
  for (const identity of [OWNER, BORROWER, OTHER]) {
    await t.withIdentity(identity).mutation(api.features.auth.users.store, {});
  }
  const toolId = await t.withIdentity(OWNER).mutation(api.features.tools.mutations.create, {
    name: "Cordless drill",
    category: "power-tools",
    condition: "good",
    description: "Two batteries and a full bit set. Great for shelves.",
  });
  return { t, toolId };
}

/** Make an approved loan whose end date is already in the past. */
async function overdueLoan(t: ReturnType<typeof convexTest>, toolId: Id<"tools">) {
  const requestId = await t
    .withIdentity(BORROWER)
    .mutation(api.features.requests.mutations.create, {
      toolId,
      startDate: dayFromNow(1),
      endDate: dayFromNow(2),
    });
  await t.withIdentity(OWNER).mutation(api.features.requests.mutations.approve, { requestId });
  await t.run(async (ctx) => {
    await ctx.db.patch(requestId, { startDate: dayFromNow(-5), endDate: dayFromNow(-2) });
  });
  return requestId;
}

async function signedFetch(
  t: ReturnType<typeof convexTest>,
  path: string,
  init: { method: "GET" | "POST"; body?: string; eventId?: string; secret?: string },
) {
  const body = init.body ?? "";
  const timestamp = String(Date.now());
  const signature = await buildSignature(init.secret ?? INCOMING_SECRET, {
    method: init.method,
    path,
    body,
    timestamp,
  });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-lendloop-timestamp": timestamp,
    "x-lendloop-signature": signature,
  };
  if (init.eventId) headers["x-lendloop-event-id"] = init.eventId;
  return await t.fetch(path, {
    method: init.method,
    headers,
    body: init.method === "POST" ? body : undefined,
  });
}

describe("Loan lifecycle and n8n integration", () => {
  let captured: Captured[];

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.ADMIN_EMAILS = "admin@example.com";
    process.env.N8N_WEBHOOK_URL = WEBHOOK_URL;
    process.env.CONVEX_TO_N8N_SECRET = OUTGOING_SECRET;
    process.env.N8N_TO_CONVEX_SECRET = INCOMING_SECRET;
    captured = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        captured.push({
          url: String(url),
          headers: init.headers as Record<string, string>,
          body: String(init.body),
        });
        return new Response("ok", { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("request → approve → return walks the happy path and notifies the right person", async () => {
    const { t, toolId } = await setup();

    const requestId = await t
      .withIdentity(BORROWER)
      .mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(1),
        endDate: dayFromNow(3),
        note: "Hanging shelves this weekend.",
      });

    const incoming = await t.withIdentity(OWNER).query(api.features.requests.queries.listIncoming);
    expect(incoming.map((request) => request._id)).toEqual([requestId]);

    await t.withIdentity(OWNER).mutation(api.features.requests.mutations.approve, { requestId });

    const browse = await t.withIdentity(OTHER).query(api.features.tools.queries.listBrowse, {});
    expect(browse).toHaveLength(1);

    await t.withIdentity(BORROWER).mutation(api.features.requests.mutations.markReturned, {
      requestId,
    });

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const events = captured.map((call) => JSON.parse(call.body));
    expect(events.map((event) => event.type)).toEqual([
      "request.created",
      "request.approved",
      "request.returned",
    ]);
    // created → owner, approved → borrower, returned by borrower → owner
    expect(events.map((event) => event.recipient.email)).toEqual([
      "owner@example.com",
      "borrower@example.com",
      "owner@example.com",
    ]);

    // Data minimization: the webhook carries no notes, descriptions, or ids of other users.
    expect(Object.keys(events[0]).sort()).toEqual(
      [
        "appUrl",
        "category",
        "counterpartName",
        "endDate",
        "eventId",
        "recipient",
        "requestId",
        "startDate",
        "status",
        "toolName",
        "type",
      ].sort(),
    );
    expect(captured[0].body).not.toContain("Hanging shelves");

    // Every outgoing call is signed with the outgoing secret over the canonical string.
    for (const call of captured) {
      expect(call.url).toBe(WEBHOOK_URL);
      const verified = await verifySignature(
        OUTGOING_SECRET,
        call.headers["x-lendloop-signature"],
        {
          method: "POST",
          path: "/webhook/lendloop/request-events",
          body: call.body,
          timestamp: call.headers["x-lendloop-timestamp"],
        },
      );
      expect(verified).toEqual({ ok: true });
    }

    const activity = await t
      .withIdentity(BORROWER)
      .query(api.features.automation.queries.recentForRequest, { requestId });
    expect(activity.filter((event) => event.status === "sent")).toHaveLength(3);

    const strangerActivity = await t
      .withIdentity(OTHER)
      .query(api.features.automation.queries.recentForRequest, { requestId });
    expect(strangerActivity).toEqual([]);
  });

  test("invalid transitions and strangers are rejected", async () => {
    const { t, toolId } = await setup();
    const requestId = await t
      .withIdentity(BORROWER)
      .mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(1),
        endDate: dayFromNow(2),
      });

    await expect(
      t.withIdentity(BORROWER).mutation(api.features.requests.mutations.markReturned, {
        requestId,
      }),
    ).rejects.toThrow(/active loan/);
    await expect(
      t.withIdentity(OTHER).mutation(api.features.requests.mutations.cancel, { requestId }),
    ).rejects.toThrow(/Only the borrower/);
    await expect(
      t.withIdentity(OTHER).mutation(api.features.requests.mutations.markReturned, { requestId }),
    ).rejects.toThrow(/lender or borrower/);
    await expect(
      t.withIdentity(BORROWER).mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(-3),
        endDate: dayFromNow(-1),
      }),
    ).rejects.toThrow();

    await t.withIdentity(BORROWER).mutation(api.features.requests.mutations.cancel, { requestId });
    await expect(
      t.withIdentity(OWNER).mutation(api.features.requests.mutations.approve, { requestId }),
    ).rejects.toThrow(/Only pending/);
  });

  test("failed webhook delivery retries three times and is recorded, not swallowed", async () => {
    const { t, toolId } = await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 502 })),
    );

    const requestId = await t
      .withIdentity(BORROWER)
      .mutation(api.features.requests.mutations.create, {
        toolId,
        startDate: dayFromNow(1),
        endDate: dayFromNow(2),
      });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetch).toHaveBeenCalledTimes(3);
    const activity = await t
      .withIdentity(OWNER)
      .query(api.features.automation.queries.recentForRequest, { requestId });
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ status: "failed", error: "n8n responded with HTTP 502." });
  });

  test("overdue endpoint requires a valid signature and returns only reminder fields", async () => {
    const { t, toolId } = await setup();
    const requestId = await overdueLoan(t, toolId);

    const unsigned = await t.fetch("/http/automation/overdue", { method: "GET" });
    expect(unsigned.status).toBe(401);

    const wrongSecret = await signedFetch(t, "/http/automation/overdue", {
      method: "GET",
      secret: OUTGOING_SECRET,
    });
    expect(wrongSecret.status).toBe(401);

    const response = await signedFetch(t, "/http/automation/overdue", { method: "GET" });
    expect(response.status).toBe(200);
    const { loans } = await response.json();
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({
      requestId,
      toolName: "Cordless drill",
      borrowerEmail: "borrower@example.com",
      reminderCount: 0,
    });
    expect(Object.keys(loans[0])).not.toContain("ownerId");
  });

  test("reminder write-back is idempotent per loan per UTC day", async () => {
    const { t, toolId } = await setup();
    const requestId = await overdueLoan(t, toolId);
    const sentAt = Date.now();
    const day = new Date(sentAt).toISOString().slice(0, 10);
    const body = JSON.stringify({ requestId, sentAt, channel: "email" });

    const first = await signedFetch(t, "/http/automation/reminders", {
      method: "POST",
      body,
      eventId: `overdue:${requestId}:${day}`,
    });
    expect(await first.json()).toMatchObject({ ok: true, duplicate: false, skipped: false });

    // A retry with the same event id is acknowledged without a second write.
    const retry = await signedFetch(t, "/http/automation/reminders", {
      method: "POST",
      body,
      eventId: `overdue:${requestId}:${day}`,
    });
    expect(await retry.json()).toMatchObject({ ok: true, duplicate: true });

    // Even a different event id cannot create a second reminder for the same day.
    const sameDay = await signedFetch(t, "/http/automation/reminders", {
      method: "POST",
      body,
      eventId: "some-other-event",
    });
    expect(await sameDay.json()).toMatchObject({ ok: true, duplicate: true });

    const loan = await t.run(async (ctx) => await ctx.db.get(requestId));
    expect(loan?.reminderCount).toBe(1);
    expect(loan?.lastRemindedOn).toBe(day);

    const reminders = await t.run(async (ctx) =>
      (await ctx.db.query("automationEvents").collect()).filter(
        (event) => event.type === "reminder.sent",
      ),
    );
    expect(reminders).toHaveLength(1);
  });

  test("a rejected write-back does not burn the event id, so a corrected retry succeeds", async () => {
    const { t, toolId } = await setup();
    const requestId = await overdueLoan(t, toolId);
    const sentAt = Date.now();
    const eventId = `overdue:${requestId}:${new Date(sentAt).toISOString().slice(0, 10)}`;

    const bad = await signedFetch(t, "/http/automation/reminders", {
      method: "POST",
      body: JSON.stringify({ requestId, sentAt, channel: "pigeon" }),
      eventId,
    });
    expect(bad.status).toBe(400);

    const good = await signedFetch(t, "/http/automation/reminders", {
      method: "POST",
      body: JSON.stringify({ requestId, sentAt, channel: "email" }),
      eventId,
    });
    expect(await good.json()).toMatchObject({ ok: true, duplicate: false, skipped: false });
  });

  test("tampered reminder bodies are rejected", async () => {
    const { t, toolId } = await setup();
    const requestId = await overdueLoan(t, toolId);
    const path = "/http/automation/reminders";
    const timestamp = String(Date.now());
    const signedBody = JSON.stringify({ requestId, sentAt: Date.now(), channel: "email" });
    const signature = await buildSignature(INCOMING_SECRET, {
      method: "POST",
      path,
      body: signedBody,
      timestamp,
    });

    const response = await t.fetch(path, {
      method: "POST",
      headers: {
        "x-lendloop-timestamp": timestamp,
        "x-lendloop-signature": signature,
        "x-lendloop-event-id": "tamper",
      },
      body: signedBody.replace("email", "mock"),
    });
    expect(response.status).toBe(401);
  });

  test("workflow failures reported by n8n show up for admins, once", async () => {
    const { t, toolId } = await setup();
    const requestId = await overdueLoan(t, toolId);
    const body = JSON.stringify({
      workflow: "LendLoop · Overdue reminders",
      executionId: "exec-42",
      node: "Send email",
      message: "SMTP connection refused",
      requestId,
    });

    for (let i = 0; i < 2; i += 1) {
      const response = await signedFetch(t, "/http/automation/failures", {
        method: "POST",
        body,
        eventId: `failure:exec-42:${i}`,
      });
      expect(response.status).toBe(200);
    }

    const failures = await t.run(async (ctx) =>
      (await ctx.db.query("automationEvents").collect()).filter(
        (event) => event.type === "workflow.failed",
      ),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ status: "failed", error: "SMTP connection refused" });
  });

  test("the internal overdue query skips returned loans", async () => {
    const { t, toolId } = await setup();
    const requestId = await overdueLoan(t, toolId);
    await t.withIdentity(OWNER).mutation(api.features.requests.mutations.markReturned, {
      requestId,
    });
    const loans = await t.query(internal.features.automation.internal.overdueLoans, {});
    expect(loans).toEqual([]);
  });
});
