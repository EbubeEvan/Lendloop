/**
 * Convex deployment environment. The only place backend code reads
 * `process.env`; set values with `npx convex env set NAME value`.
 *
 * These are functions, not constants: Convex reads env at call time, and tests
 * change `process.env` between cases, so values must never be cached at
 * module load.
 */

const DEFAULT_APP_URL = "http://localhost:3000";

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const env = {
  /** Comma-separated admin allowlist, lowercased. */
  adminEmails(): string[] {
    return (read("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  },

  /** Origin used for links in notification emails. */
  appUrl(): string {
    return read("APP_URL") ?? DEFAULT_APP_URL;
  },

  /** Clerk issuer for Convex auth; read at deploy time by auth.config.ts. */
  clerkIssuerDomain(): string {
    return read("CLERK_JWT_ISSUER_DOMAIN") ?? "";
  },

  /** Outgoing webhook (Convex → n8n). Both values are needed to dispatch. */
  n8nWebhook(): { url: string; secret: string } | null {
    const url = read("N8N_WEBHOOK_URL");
    const secret = read("CONVEX_TO_N8N_SECRET");
    return url && secret ? { url, secret } : null;
  },

  /** Secret n8n uses to sign calls into Convex HTTP routes. */
  incomingSecret(): string | undefined {
    return read("N8N_TO_CONVEX_SECRET");
  },

  /** Local demo seeding switch; must stay off in production. */
  allowDevSeed(): boolean {
    return read("ALLOW_DEV_SEED") === "true";
  },
} as const;
