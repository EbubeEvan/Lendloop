/**
 * Generates the importable n8n workflows in n8n/workflows/.
 *
 * Keeping the workflows in a generator means the HMAC canonical string, the
 * retry policy, and the idempotency keys stay in one reviewable place. Run
 * `pnpm n8n:build` after editing, then commit the generated JSON.
 *
 * No secrets are embedded: every workflow reads its configuration from `$env`
 * at runtime (N8N_BLOCK_ENV_ACCESS_IN_NODE must stay false).
 */
import { mkdir, writeFile } from "node:fs/promises";

const OUTPUT_DIR = new URL("../n8n/workflows/", import.meta.url);

// Shared by every Code node that talks to Convex. `\n` is intentional: the
// canonical string is `${timestamp}\n${METHOD}\n${path}\n${sha256(body)}`.
const HMAC_HELPERS = String.raw`
const { createHash, createHmac, timingSafeEqual } = require("crypto");

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sign(secret, timestamp, method, path, body) {
  const canonical = [timestamp, method.toUpperCase(), path, sha256(body)].join("\n");
  return "v1=" + createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
`;

const VERIFY_INCOMING = String.raw`${HMAC_HELPERS}

// Convex signs the exact request path it called. Keep this in sync with
// N8N_WEBHOOK_URL in the Convex environment.
const WEBHOOK_PATH = "/webhook/lendloop/request-events";
const MAX_SKEW_MS = 5 * 60 * 1000;

const secret = $env.CONVEX_TO_N8N_SECRET;
if (!secret) {
  return [{ json: { ok: false, reason: "CONVEX_TO_N8N_SECRET is not configured." } }];
}

const item = $input.first().json;
const headers = item.headers || {};
const timestamp = String(headers["x-lendloop-timestamp"] || "");
const signature = String(headers["x-lendloop-signature"] || "");
const eventId = String(headers["x-lendloop-event-id"] || "");
const sentAt = Number(timestamp);

if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) {
  return [{ json: { ok: false, reason: "Signature timestamp is outside the allowed window." } }];
}

// Convex signs compact JSON, and JSON.parse preserves key order, so
// re-serialising the parsed body reproduces the signed payload byte for byte.
const body = JSON.stringify(item.body || {});
const expected = sign(secret, timestamp, "POST", WEBHOOK_PATH, body);

if (!safeEqual(expected, signature)) {
  return [{ json: { ok: false, reason: "Signature mismatch." } }];
}

return [{ json: { ok: true, eventId, payload: item.body || {} } }];
`;

const COMPOSE_REQUEST_EMAIL = String.raw`${HMAC_HELPERS}

const payload = $input.first().json.payload || {};
const from = $env.SMTP_FROM || "lendloop@example.test";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
  });
}

const copy = {
  "request.created": {
    subject: "New request: " + payload.toolName,
    intro: payload.counterpartName + " would like to borrow " + payload.toolName + ".",
    cta: "Review the request",
    path: "/incoming",
  },
  "request.approved": {
    subject: "Approved: " + payload.toolName,
    intro: payload.counterpartName + " approved your request for " + payload.toolName + ".",
    cta: "View your loans",
    path: "/loans",
  },
  "request.declined": {
    subject: "Rejected: " + payload.toolName,
    intro: payload.counterpartName + " rejected your request for " + payload.toolName + ". The request is closed, so you can ask another neighbor or pick new dates.",
    cta: "Find another tool",
    path: "/browse",
  },
  "request.cancelled": {
    subject: "Cancelled: " + payload.toolName,
    intro: payload.counterpartName + " cancelled their request for " + payload.toolName + ".",
    cta: "View your listings",
    path: "/listings",
  },
  "request.returned": {
    subject: "Returned: " + payload.toolName,
    intro: payload.counterpartName + " marked " + payload.toolName + " as returned.",
    cta: "View the loan",
    path: "/loans",
  },
};

const fallback = copy["request.created"];
const content = copy[payload.type] || fallback;
const url = (payload.appUrl || "http://localhost:3000") + content.path;
const safeTool = escapeHtml(payload.toolName);
const safeIntro = escapeHtml(content.intro);

const html =
  '<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1f2937;">' +
  '<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;margin:0 0 8px;">LendLoop</p>' +
  '<h1 style="font-size:22px;margin:0 0 12px;">' + safeTool + "</h1>" +
  '<p style="line-height:1.6;margin:0 0 8px;">' + safeIntro + "</p>" +
  '<p style="line-height:1.6;margin:0 0 24px;color:#4b5563;">' +
  escapeHtml(payload.startDate) + " &rarr; " + escapeHtml(payload.endDate) +
  " &middot; " + escapeHtml(payload.status) + "</p>" +
  '<a href="' + escapeHtml(url) + '" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">' +
  escapeHtml(content.cta) + "</a>" +
  '<p style="font-size:12px;color:#9ca3af;margin:32px 0 0;">You are receiving this because you use LendLoop. Replies are not monitored.</p>' +
  "</div>";

const text = [
  content.intro,
  "Borrow window: " + payload.startDate + " to " + payload.endDate,
  "Status: " + payload.status,
  content.cta + ": " + url,
].join("\n");

return [{
  json: {
    eventId: payload.eventId,
    mail: {
      From: { Email: from, Name: "LendLoop" },
      To: [{ Email: payload.recipient.email, Name: payload.recipient.name }],
      Subject: content.subject,
      Html: html,
      Text: text,
    },
  },
}];
`;

const SIGN_OVERDUE_PULL = String.raw`${HMAC_HELPERS}

const secret = $env.N8N_TO_CONVEX_SECRET;
const base = String($env.CONVEX_SITE_URL || "").replace(/\/+$/, "");
if (!secret || !base) {
  throw new Error("CONVEX_SITE_URL and N8N_TO_CONVEX_SECRET must be set.");
}

const path = "/http/automation/overdue";
const timestamp = String(Date.now());

return [{
  json: {
    url: base + path,
    timestamp,
    signature: sign(secret, timestamp, "GET", path, ""),
  },
}];
`;

const FILTER_TODAY = String.raw`
const today = new Date().toISOString().slice(0, 10);
const response = $input.first().json || {};
const loans = Array.isArray(response.loans) ? response.loans : [];

// A retry or a manual re-run on the same UTC day must not email twice.
return loans
  .filter(function (loan) {
    return loan.lastRemindedOn !== today;
  })
  .map(function (loan) {
    return { json: loan };
  });
`;

const COMPOSE_REMINDER = String.raw`${HMAC_HELPERS}

const loan = $input.first().json;
const secret = $env.N8N_TO_CONVEX_SECRET;
const base = String($env.CONVEX_SITE_URL || "").replace(/\/+$/, "");
const from = $env.SMTP_FROM || "lendloop@example.test";
if (!secret || !base) {
  throw new Error("CONVEX_SITE_URL and N8N_TO_CONVEX_SECRET must be set.");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
  });
}

const sentAt = Date.now();
const day = new Date(sentAt).toISOString().slice(0, 10);
const eventId = "overdue:" + loan.requestId + ":" + day;
const path = "/http/automation/reminders";
const body = JSON.stringify({ requestId: loan.requestId, sentAt, channel: "email" });

const due = new Date(loan.endDate + "T00:00:00Z").getTime();
const daysOverdue = Math.max(1, Math.round((Date.now() - due) / 86400000));
const safeTool = escapeHtml(loan.toolName);
const url = String($env.APP_URL || "http://localhost:3000") + "/loans";

const html =
  '<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1f2937;">' +
  '<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#b45309;margin:0 0 8px;">Overdue reminder</p>' +
  '<h1 style="font-size:22px;margin:0 0 12px;">' + safeTool + " is " + daysOverdue + " day" + (daysOverdue === 1 ? "" : "s") + " overdue</h1>" +
  '<p style="line-height:1.6;margin:0 0 8px;">Hi ' + escapeHtml(loan.borrowerName) + ", the loan was due on " + escapeHtml(loan.endDate) + ".</p>" +
  '<p style="line-height:1.6;margin:0 0 24px;color:#4b5563;">Return it to keep the neighborhood shelf healthy, or ask the owner for more time.</p>' +
  '<a href="' + escapeHtml(url) + '" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Open my loans</a>' +
  '<p style="font-size:12px;color:#9ca3af;margin:32px 0 0;">You will get at most one reminder per day for this loan.</p>' +
  "</div>";

return [{
  json: {
    mail: {
      From: { Email: from, Name: "LendLoop" },
      To: [{ Email: loan.borrowerEmail, Name: loan.borrowerName }],
      Subject: "Overdue: " + loan.toolName + " was due " + loan.endDate,
      Html: html,
      Text: "Hi " + loan.borrowerName + ", " + loan.toolName + " was due on " + loan.endDate + " (" + daysOverdue + " day(s) overdue). Open " + url + " to return it.",
    },
    writeBack: {
      url: base + path,
      headers: {
        "content-type": "application/json",
        "x-lendloop-timestamp": String(sentAt),
        "x-lendloop-signature": sign(secret, String(sentAt), "POST", path, body),
        "x-lendloop-event-id": eventId,
      },
      body,
    },
  },
}];
`;

const COMPOSE_FAILURE = String.raw`${HMAC_HELPERS}

const item = $input.first().json || {};
const execution = item.execution || {};
const workflow = item.workflow || {};
const secret = $env.N8N_TO_CONVEX_SECRET;
const base = String($env.CONVEX_SITE_URL || "").replace(/\/+$/, "");
if (!secret || !base) {
  throw new Error("CONVEX_SITE_URL and N8N_TO_CONVEX_SECRET must be set.");
}

const executionId = String(execution.id || "");
const node = String(execution.lastNodeExecuted || "");
const message = String(
  (execution.error && execution.error.message) ||
  (item.error && item.error.message) ||
  "Workflow execution failed.",
);

const payload = {
  workflow: String(workflow.name || "Unknown workflow").slice(0, 120),
  executionId: executionId.slice(0, 120),
  node: node.slice(0, 120),
  message: message.slice(0, 1000),
};

const path = "/http/automation/failures";
const timestamp = String(Date.now());
const body = JSON.stringify(payload);

return [{
  json: {
    url: base + path,
    headers: {
      "content-type": "application/json",
      "x-lendloop-timestamp": timestamp,
      "x-lendloop-signature": sign(secret, timestamp, "POST", path, body),
      "x-lendloop-event-id": "failure:" + (executionId || node || timestamp),
    },
    body,
  },
}];
`;

function codeNode(name, code, position) {
  return {
    parameters: { mode: "runOnceForAllItems", language: "javaScript", jsCode: code },
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
  };
}

function httpNode(name, position, { method, url, headers, body, retry = true }) {
  const parameters = {
    method,
    url,
    authentication: "none",
    sendHeaders: true,
    headerParameters: { parameters: headers },
    options: { timeout: 15000 },
  };

  if (body) {
    parameters.sendBody = true;
    parameters.specifyBody = "json";
    parameters.jsonBody = body;
  }

  return {
    parameters,
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    retryOnFail: retry,
    maxTries: retry ? 3 : 1,
    waitBetweenTries: 2000,
  };
}

const MAILPIT_SEND = "http://mailpit:8025/api/v1/send";

const requestNotifications = {
  name: "LendLoop — Request notifications",
  active: false,
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "lendloop/request-events",
        responseMode: "responseNode",
        options: {},
      },
      id: "webhook-request-events",
      name: "Convex webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-200, 0],
      webhookId: "lendloop-request-events",
    },
    codeNode("Verify signature", VERIFY_INCOMING, [40, 0]),
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [
            {
              id: "signature-ok",
              leftValue: "={{ $json.ok }}",
              rightValue: "",
              operator: { type: "boolean", operation: "true", singleValue: true },
            },
          ],
          combinator: "and",
        },
        options: {},
      },
      id: "if-signature-valid",
      name: "Signature valid?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [280, 0],
    },
    codeNode("Compose notification", COMPOSE_REQUEST_EMAIL, [520, -140]),
    httpNode("Send via Mailpit", [760, -140], {
      method: "POST",
      url: MAILPIT_SEND,
      headers: [],
      body: "={{ JSON.stringify($json.mail) }}",
    }),
    {
      parameters: {
        respondWith: "json",
        responseBody:
          '={{ JSON.stringify({ received: true, eventId: $("Compose notification").item.json.eventId }) }}',
        options: { responseCode: 200 },
      },
      id: "respond-accepted",
      name: "Respond 200",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1000, -140],
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ JSON.stringify({ error: $json.reason || 'Invalid signature.' }) }}",
        options: { responseCode: 401 },
      },
      id: "respond-rejected",
      name: "Respond 401",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [520, 140],
    },
  ],
  connections: {
    "Convex webhook": { main: [[{ node: "Verify signature", type: "main", index: 0 }]] },
    "Verify signature": { main: [[{ node: "Signature valid?", type: "main", index: 0 }]] },
    "Signature valid?": {
      main: [
        [{ node: "Compose notification", type: "main", index: 0 }],
        [{ node: "Respond 401", type: "main", index: 0 }],
      ],
    },
    "Compose notification": { main: [[{ node: "Send via Mailpit", type: "main", index: 0 }]] },
    "Send via Mailpit": { main: [[{ node: "Respond 200", type: "main", index: 0 }]] },
  },
  settings: { executionOrder: "v1", saveManualExecutions: true, timezone: "UTC" },
  staticData: null,
  meta: { templateCredsSetupCompleted: true },
  tags: [],
};

const overdueReminders = {
  name: "LendLoop — Overdue reminders",
  active: false,
  nodes: [
    {
      parameters: {
        rule: {
          interval: [{ field: "days", hoursInterval: 24, triggerAtHour: 9, triggerAtMinute: 0 }],
        },
      },
      id: "daily-0900",
      name: "Every day at 09:00",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [-260, 0],
    },
    codeNode("Sign overdue request", SIGN_OVERDUE_PULL, [-20, 0]),
    httpNode("Fetch overdue loans", [220, 0], {
      method: "GET",
      url: "={{ $json.url }}",
      headers: [
        { name: "x-lendloop-timestamp", value: "={{ $json.timestamp }}" },
        { name: "x-lendloop-signature", value: "={{ $json.signature }}" },
      ],
    }),
    codeNode("Skip already reminded", FILTER_TODAY, [460, 0]),
    {
      parameters: { batchSize: 1, options: { reset: false } },
      id: "loop-over-loans",
      name: "Loop over loans",
      type: "n8n-nodes-base.splitInBatches",
      typeVersion: 3,
      position: [700, 0],
    },
    codeNode("Compose reminder", COMPOSE_REMINDER, [940, 160]),
    httpNode("Send reminder email", [1180, 160], {
      method: "POST",
      url: MAILPIT_SEND,
      headers: [],
      body: "={{ JSON.stringify($json.mail) }}",
    }),
    httpNode("Record reminder in Convex", [1420, 160], {
      method: "POST",
      url: '={{ $("Compose reminder").item.json.writeBack.url }}',
      headers: [
        {
          name: "x-lendloop-timestamp",
          value: '={{ $("Compose reminder").item.json.writeBack.headers["x-lendloop-timestamp"] }}',
        },
        {
          name: "x-lendloop-signature",
          value: '={{ $("Compose reminder").item.json.writeBack.headers["x-lendloop-signature"] }}',
        },
        {
          name: "x-lendloop-event-id",
          value: '={{ $("Compose reminder").item.json.writeBack.headers["x-lendloop-event-id"] }}',
        },
      ],
      body: '={{ $("Compose reminder").item.json.writeBack.body }}',
    }),
    {
      parameters: {},
      id: "no-more-loans",
      name: "Done for today",
      type: "n8n-nodes-base.noOp",
      typeVersion: 1,
      position: [940, -140],
    },
  ],
  connections: {
    "Every day at 09:00": { main: [[{ node: "Sign overdue request", type: "main", index: 0 }]] },
    "Sign overdue request": { main: [[{ node: "Fetch overdue loans", type: "main", index: 0 }]] },
    "Fetch overdue loans": { main: [[{ node: "Skip already reminded", type: "main", index: 0 }]] },
    "Skip already reminded": { main: [[{ node: "Loop over loans", type: "main", index: 0 }]] },
    "Loop over loans": {
      main: [
        [{ node: "Done for today", type: "main", index: 0 }],
        [{ node: "Compose reminder", type: "main", index: 0 }],
      ],
    },
    "Compose reminder": { main: [[{ node: "Send reminder email", type: "main", index: 0 }]] },
    "Send reminder email": {
      main: [[{ node: "Record reminder in Convex", type: "main", index: 0 }]],
    },
    "Record reminder in Convex": { main: [[{ node: "Loop over loans", type: "main", index: 0 }]] },
  },
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
    timezone: "UTC",
    executionTimeout: 7200,
  },
  staticData: null,
  meta: { templateCredsSetupCompleted: true },
  tags: [],
};

const errorHandler = {
  name: "LendLoop — Error handler",
  active: false,
  nodes: [
    {
      parameters: {},
      id: "error-trigger",
      name: "On workflow error",
      type: "n8n-nodes-base.errorTrigger",
      typeVersion: 1,
      position: [-220, 0],
    },
    codeNode("Compose failure report", COMPOSE_FAILURE, [20, 0]),
    httpNode("Report failure to Convex", [260, 0], {
      method: "POST",
      url: "={{ $json.url }}",
      headers: [
        { name: "x-lendloop-timestamp", value: "={{ $json.headers['x-lendloop-timestamp'] }}" },
        { name: "x-lendloop-signature", value: "={{ $json.headers['x-lendloop-signature'] }}" },
        { name: "x-lendloop-event-id", value: "={{ $json.headers['x-lendloop-event-id'] }}" },
      ],
      body: "={{ $json.body }}",
      retry: false,
    }),
  ],
  connections: {
    "On workflow error": { main: [[{ node: "Compose failure report", type: "main", index: 0 }]] },
    "Compose failure report": {
      main: [[{ node: "Report failure to Convex", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1", saveManualExecutions: true, timezone: "UTC" },
  staticData: null,
  meta: { templateCredsSetupCompleted: true },
  tags: [],
};

const workflows = [
  ["request-notifications.json", requestNotifications],
  ["overdue-reminders.json", overdueReminders],
  ["error-handler.json", errorHandler],
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const [file, workflow] of workflows) {
  await writeFile(new URL(file, OUTPUT_DIR), `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
  console.log(`wrote n8n/workflows/${file}`);
}
