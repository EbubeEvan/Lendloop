import { describe, expect, test } from "vitest";

import { todayIso } from "../../convex/lib/dates";
import {
  normalizeText,
  validateNote,
  validateRequestDates,
  validateToolInput,
} from "../../convex/lib/validation";

const NOW = Date.parse("2026-06-01T12:00:00.000Z");
const today = todayIso(NOW);

describe("validation", () => {
  test("normalizes tool names", () => {
    expect(normalizeText("  Cordless   drill  ")).toBe("Cordless drill");
  });

  test("rejects short names and descriptions", () => {
    expect(() => validateToolInput({ name: "a", description: "long enough description" })).toThrow(
      /Tool name/i,
    );
    expect(() => validateToolInput({ name: "Drill", description: "too short" })).toThrow(
      /Description/i,
    );
  });

  test("accepts a valid tool", () => {
    expect(
      validateToolInput({ name: "  Impact driver ", description: " 18V with two batteries " }),
    ).toEqual({
      name: "Impact driver",
      description: "18V with two batteries",
    });
  });

  test("rejects past start dates", () => {
    expect(() => validateRequestDates("2026-05-31", "2026-06-02", NOW)).toThrow(/past/i);
  });

  test("rejects reversed and overlong ranges", () => {
    expect(() => validateRequestDates("2026-06-05", "2026-06-04", NOW)).toThrow(/on or after/i);
    const end = new Date(NOW + 40 * 86_400_000).toISOString().slice(0, 10);
    expect(() => validateRequestDates(today, end, NOW)).toThrow(/at most 30 days/i);
  });

  test("accepts a normal range", () => {
    expect(() => validateRequestDates("2026-06-02", "2026-06-06", NOW)).not.toThrow();
  });

  test("trims notes and drops empty values", () => {
    expect(validateNote("   ")).toBeUndefined();
    expect(validateNote("  Thanks! ")).toBe("Thanks!");
    expect(() => validateNote("x".repeat(401))).toThrow(/400/);
  });
});
