#!/usr/bin/env node
/**
 * A tiny stand-in for the Convex HTTP endpoints, so the n8n workflows can be
 * exercised without a Convex deployment.
 *
 *   N8N_TO_CONVEX_SECRET=<same value as n8n/.env> pnpm mock:http
 *
 * Point CONVEX_SITE_URL at http://host.docker.internal:3210 (the default in
 * n8n/.env.example), import the workflows, run "LendLoop — Overdue reminders"
 * manually, then watch Mailpit at http://localhost:8025.
 *
 * It verifies the same signature scheme as convex/http.ts:
 *   v1=HMAC-SHA256(secret, `${timestamp}\n${METHOD}\n${path}\n${sha256(body)}`)
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_CONVEX_PORT ?? 3210);
const SECRET = process.env.N8N_TO_CONVEX_SECRET;
const MAX_SKEW_MS = 5 * 60 * 1000;

if (!SECRET) {
  console.error("N8N_TO_CONVEX_SECRET is required (use the value from n8n/.env).");
  process.exit(1);
}

const seenEvents = new Set();

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function expectedSignature(timestamp, method, path, body) {
  const canonical = [timestamp, method.toUpperCase(), path, sha256(body)].join("\n");
  return `v1=${createHmac("sha256", SECRET).update(canonical, "utf8").digest("hex")}`;
}

function verify(request, body) {
  const timestamp = request.headers["x-lendloop-timestamp"];
  const signature = request.headers["x-lendloop-signature"];
  if (typeof timestamp !== "string" || typeof signature !== "string") {
    return "Missing signature.";
  }
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) {
    return "Signature timestamp is outside the allowed window.";
  }
  const path = new URL(request.url, `http://localhost:${PORT}`).pathname;
  const expected = expectedSignature(timestamp, request.method, path, body);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return "Signature mismatch.";
  }
  return null;
}

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function log(message) {
  console.log(`[mock-convex] ${new Date().toISOString()} ${message}`);
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const SAMPLE_LOANS = [
  {
    requestId: "mock-request-ladder",
    toolName: "Aluminium ladder",
    startDate: yesterday,
    endDate: yesterday,
    borrowerName: "Sam Rivera",
    borrowerEmail: "sam@example.test",
    reminderCount: 0,
  },
  {
    requestId: "mock-request-tiller",
    toolName: "Garden tiller",
    startDate: yesterday,
    endDate: yesterday,
    borrowerName: "Jo Chen",
    borrowerEmail: "jo@example.test",
    reminderCount: 1,
    lastRemindedOn: today,
  },
];

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 32_768) {
        reject(new Error("Payload too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, `http://localhost:${PORT}`).pathname;
  let body = "";

  try {
    body = await readBody(request);
  } catch (error) {
    json(response, 413, { error: error.message });
    return;
  }

  const problem = verify(request, body);
  if (problem) {
    log(`rejected ${request.method} ${path} — ${problem}`);
    json(response, 401, { error: problem });
    return;
  }

  if (path === "/http/automation/overdue" && request.method === "GET") {
    log(`overdue pull — ${SAMPLE_LOANS.length} loan(s), one already reminded today`);
    json(response, 200, { generatedAt: Date.now(), loans: SAMPLE_LOANS });
    return;
  }

  if (path === "/http/automation/reminders" && request.method === "POST") {
    const eventId = request.headers["x-lendloop-event-id"];
    if (typeof eventId !== "string" || eventId.length === 0) {
      json(response, 400, { error: "Missing event id." });
      return;
    }
    if (seenEvents.has(eventId)) {
      log(`reminder ${eventId} — duplicate, not recorded twice`);
      json(response, 200, { ok: true, duplicate: true });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      json(response, 400, { error: "Invalid JSON." });
      return;
    }

    if (typeof payload.requestId !== "string" || typeof payload.sentAt !== "number") {
      json(response, 400, { error: "Invalid reminder payload." });
      return;
    }

    seenEvents.add(eventId);
    const day = new Date(payload.sentAt).toISOString().slice(0, 10);
    log(`reminder recorded for ${payload.requestId} on ${day} (${eventId})`);
    json(response, 200, {
      ok: true,
      duplicate: false,
      skipped: false,
      idempotencyKey: `overdue:${payload.requestId}:${day}`,
    });
    return;
  }

  if (path === "/http/automation/failures" && request.method === "POST") {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      json(response, 400, { error: "Invalid JSON." });
      return;
    }
    log(`workflow failure reported — ${payload.workflow}: ${payload.message}`);
    json(response, 200, { ok: true, duplicate: false });
    return;
  }

  json(response, 404, { error: "Not found." });
});

server.listen(PORT, () => {
  log(`listening on http://localhost:${PORT}`);
  log(
    "routes: GET /http/automation/overdue, POST /http/automation/reminders, POST /http/automation/failures",
  );
  log("point n8n's CONVEX_SITE_URL at http://host.docker.internal:" + PORT);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
