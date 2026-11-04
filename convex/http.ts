import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { verifySignature } from "./lib/hmac";

const http = httpRouter();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function verifyIncoming(
  request: Request,
  body: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const secret = process.env.N8N_TO_CONVEX_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: json({ error: "Integration is not configured." }, 503),
    };
  }

  const path = new URL(request.url).pathname;
  const result = await verifySignature(secret, request.headers.get("x-lendloop-signature"), {
    method: request.method,
    path,
    body,
    timestamp: request.headers.get("x-lendloop-timestamp") ?? "",
  });

  if (!result.ok) {
    return { ok: false, response: json({ error: result.reason }, 401) };
  }

  return { ok: true };
}

async function readBody(request: Request, maxBytes = 32_768): Promise<string | null> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return null;
  }
  return text;
}

http.route({
  path: "/http/automation/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const verified = await verifyIncoming(request, "");
    if (!verified.ok) {
      return verified.response;
    }

    const loans = await ctx.runQuery(internal.features.automation.internal.overdueLoans, {});
    return json({ generatedAt: Date.now(), loans });
  }),
});

http.route({
  path: "/http/automation/reminders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readBody(request);
    if (body === null) {
      return json({ error: "Payload too large." }, 413);
    }

    const verified = await verifyIncoming(request, body);
    if (!verified.ok) {
      return verified.response;
    }

    const eventId = request.headers.get("x-lendloop-event-id");
    if (!eventId || eventId.length > 200) {
      return json({ error: "Missing event id." }, 400);
    }
    const fresh = await ctx.runMutation(internal.features.automation.internal.consumeReplayKey, {
      key: `incoming:${eventId}`,
    });
    if (!fresh) {
      return json({ ok: true, duplicate: true });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { requestId?: unknown }).requestId !== "string" ||
      typeof (payload as { sentAt?: unknown }).sentAt !== "number" ||
      !["email", "slack", "discord", "mock"].includes(
        String((payload as { channel?: unknown }).channel),
      )
    ) {
      return json({ error: "Invalid reminder payload." }, 400);
    }

    const { requestId, sentAt, channel } = payload as {
      requestId: string;
      sentAt: number;
      channel: "email" | "slack" | "discord" | "mock";
    };

    try {
      const result = await ctx.runMutation(internal.features.automation.internal.recordReminder, {
        requestId: requestId as never,
        sentAt,
        channel,
      });
      return json({ ok: true, ...result });
    } catch {
      return json({ error: "Reminder could not be recorded." }, 400);
    }
  }),
});

http.route({
  path: "/http/automation/failures",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readBody(request);
    if (body === null) {
      return json({ error: "Payload too large." }, 413);
    }

    const verified = await verifyIncoming(request, body);
    if (!verified.ok) {
      return verified.response;
    }

    const eventId = request.headers.get("x-lendloop-event-id");
    const fresh = await ctx.runMutation(internal.features.automation.internal.consumeReplayKey, {
      key: `failure:${eventId ?? body.slice(0, 80)}`,
    });
    if (!fresh) {
      return json({ ok: true, duplicate: true });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    const data = payload as {
      workflow?: unknown;
      executionId?: unknown;
      node?: unknown;
      message?: unknown;
      requestId?: unknown;
    };

    if (typeof data.workflow !== "string" || typeof data.message !== "string") {
      return json({ error: "Invalid failure payload." }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.features.automation.internal.recordFailure, {
        workflow: data.workflow.slice(0, 120),
        executionId:
          typeof data.executionId === "string" ? data.executionId.slice(0, 120) : undefined,
        node: typeof data.node === "string" ? data.node.slice(0, 120) : undefined,
        message: data.message.slice(0, 1000),
        requestId: typeof data.requestId === "string" ? (data.requestId as never) : undefined,
      });
      return json({ ok: true, ...result });
    } catch {
      return json({ error: "Failure could not be recorded." }, 400);
    }
  }),
});

export default http;
