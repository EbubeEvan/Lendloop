import { describe, expect, test } from "vitest";

import {
  buildSignature,
  hmacSha256Hex,
  reminderIdempotencyKey,
  safeEqualHex,
  sha256Hex,
  verifySignature,
} from "../../convex/lib/hmac";

const SECRET = "test-secret-value";
const TIMESTAMP = "1700000000000";

describe("HMAC signing", () => {
  test("sha256Hex is stable", async () => {
    expect(await sha256Hex("lendloop")).toBe(await sha256Hex("lendloop"));
    expect(await sha256Hex("lendloop")).toHaveLength(64);
    expect(await sha256Hex("lendloop")).not.toBe(await sha256Hex("LendLoop"));
  });

  test("hmac is deterministic for the same input", async () => {
    expect(await hmacSha256Hex(SECRET, "hello")).toBe(await hmacSha256Hex(SECRET, "hello"));
    expect(await hmacSha256Hex(SECRET, "hello")).not.toBe(await hmacSha256Hex(SECRET, "hello!"));
  });

  test("builds and verifies a v1 signature", async () => {
    const body = JSON.stringify({ type: "request.created", requestId: "abc" });
    const input = {
      method: "POST",
      path: "/webhook/lendloop/request-events",
      body,
      timestamp: TIMESTAMP,
    };
    const signature = await buildSignature(SECRET, input);

    expect(signature.startsWith("v1=")).toBe(true);
    await expect(verifySignature(SECRET, signature, input, Number(TIMESTAMP))).resolves.toEqual({
      ok: true,
    });
  });

  test("rejects a tampered body", async () => {
    const timestamp = String(Date.now());
    const body = JSON.stringify({ amount: 1 });
    const signature = await buildSignature(SECRET, {
      method: "POST",
      path: "/hook",
      body,
      timestamp,
    });

    const result = await verifySignature(
      SECRET,
      signature,
      { method: "POST", path: "/hook", body: JSON.stringify({ amount: 2 }), timestamp },
      Date.now(),
    );
    expect(result).toEqual({ ok: false, reason: "Signature mismatch." });
  });

  test("rejects stale timestamps", async () => {
    const timestamp = String(Date.now() - 10 * 60 * 1000);
    const body = "{}";
    const signature = await buildSignature(SECRET, {
      method: "POST",
      path: "/hook",
      body,
      timestamp,
    });

    const result = await verifySignature(
      SECRET,
      signature,
      { method: "POST", path: "/hook", body, timestamp },
      Date.now(),
    );
    expect(result.ok).toBe(false);
  });

  test("safeEqualHex is length aware", () => {
    expect(safeEqualHex("abcd", "abcd")).toBe(true);
    expect(safeEqualHex("abcd", "abce")).toBe(false);
    expect(safeEqualHex("abc", "abcd")).toBe(false);
  });

  test("reminder keys are scoped to request and day", () => {
    expect(reminderIdempotencyKey("req1", "2026-01-01")).toBe("overdue:req1:2026-01-01");
    expect(reminderIdempotencyKey("req1", "2026-01-02")).not.toBe(
      reminderIdempotencyKey("req1", "2026-01-01"),
    );
  });
});
