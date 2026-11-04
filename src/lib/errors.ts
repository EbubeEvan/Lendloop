import { ConvexError } from "convex/values";

type ErrorPayload = {
  code?: string;
  message?: string;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as ErrorPayload | undefined;
    if (data && typeof data === "object" && typeof data.message === "string") {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    const data = error.data as ErrorPayload | undefined;
    return data?.code;
  }
  return undefined;
}
