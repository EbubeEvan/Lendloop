import { ConvexError } from "convex/values";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTEGRATION_DISABLED"
  | "INTERNAL";

/**
 * Errors thrown with ConvexError are safe to surface to the client.
 * Anything else is treated as an internal error and becomes a generic message.
 */
export function appError(code: AppErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}

export function assert(condition: unknown, code: AppErrorCode, message: string): asserts condition {
  if (!condition) {
    appError(code, message);
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
