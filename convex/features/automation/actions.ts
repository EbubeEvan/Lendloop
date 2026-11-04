import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { env } from "../../lib/env";
import { buildSignature } from "../../lib/hmac";
import { automationTypeValidator } from "../../schema";

const MAX_ATTEMPTS = 3;

export const dispatchRequestEvent = internalAction({
  args: {
    requestId: v.id("borrowRequests"),
    type: automationTypeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.features.automation.internal.getNotificationContext,
      { requestId: args.requestId, type: args.type },
    );
    if (!context) {
      return null;
    }

    const idempotencyKey = `${args.type}:${args.requestId}:${context.updatedAt}`;
    const alreadySent = await ctx.runQuery(internal.features.automation.internal.eventExists, {
      idempotencyKey,
    });
    if (alreadySent) {
      return null;
    }

    const webhook = env.n8nWebhook();
    if (!webhook) {
      await ctx.runMutation(internal.features.automation.internal.recordDispatchResult, {
        requestId: args.requestId,
        type: args.type,
        status: "failed",
        idempotencyKey,
        detail: "Automation is not configured.",
        error: "N8N_WEBHOOK_URL or CONVEX_TO_N8N_SECRET is missing.",
      });
      return null;
    }

    const payload = {
      eventId: idempotencyKey,
      type: args.type,
      requestId: args.requestId,
      toolName: context.toolName,
      category: context.category,
      startDate: context.startDate,
      endDate: context.endDate,
      status: context.status,
      recipient: context.recipient,
      counterpartName: context.counterpartName,
      appUrl: context.appUrl,
    };
    const { url: webhookUrl, secret } = webhook;
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());

    let lastError = "Unknown delivery error.";
    let delivered = false;

    try {
      const signature = await buildSignature(secret, {
        method: "POST",
        path: new URL(webhookUrl).pathname,
        body,
        timestamp,
      });

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-lendloop-timestamp": timestamp,
              "x-lendloop-signature": signature,
              "x-lendloop-event-id": idempotencyKey,
            },
            body,
          });

          if (!response.ok) {
            lastError = `n8n responded with HTTP ${response.status}.`;
            continue;
          }

          delivered = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Network request failed.";
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Invalid webhook configuration.";
    }

    await ctx.runMutation(internal.features.automation.internal.recordDispatchResult, {
      requestId: args.requestId,
      type: args.type,
      status: delivered ? "sent" : "failed",
      idempotencyKey,
      detail: delivered
        ? `Request notification delivered to n8n (${args.type}).`
        : `Request notification failed after ${MAX_ATTEMPTS} attempts.`,
      error: delivered ? undefined : lastError,
    });

    return null;
  },
});
