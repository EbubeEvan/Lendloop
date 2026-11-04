const encoder = new TextEncoder();
const MAX_SKEW_MS = 5 * 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(digest);
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(signature);
}

/** Constant-time comparison for hex signatures. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export type SignatureInput = {
  method: string;
  path: string;
  body: string;
  timestamp: string;
};

export async function buildSignature(secret: string, input: SignatureInput): Promise<string> {
  const bodyHash = await sha256Hex(input.body);
  const canonical = [input.timestamp, input.method.toUpperCase(), input.path, bodyHash].join("\n");

  return `v1=${await hmacSha256Hex(secret, canonical)}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export async function verifySignature(
  secret: string,
  signature: string | null,
  input: SignatureInput,
  now: number = Date.now(),
): Promise<VerifyResult> {
  if (!signature) {
    return { ok: false, reason: "Missing signature." };
  }

  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "Invalid timestamp." };
  }
  if (Math.abs(now - timestamp) > MAX_SKEW_MS) {
    return { ok: false, reason: "Signature timestamp is outside the allowed window." };
  }

  const expected = await buildSignature(secret, input);
  if (!safeEqualHex(expected, signature)) {
    return { ok: false, reason: "Signature mismatch." };
  }

  return { ok: true };
}

/**
 * The idempotency key for an overdue reminder is scoped to one UTC day so
 * n8n retries can never notify the same borrower twice for the same loan/day.
 */
export function reminderIdempotencyKey(requestId: string, day: string): string {
  return `overdue:${requestId}:${day}`;
}
