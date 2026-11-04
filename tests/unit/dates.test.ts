import { describe, expect, test } from "vitest";

import {
  addDaysIso,
  daysBetween,
  isOverdue,
  isValidDateString,
  rangesOverlap,
  todayIso,
} from "../../convex/lib/dates";

describe("calendar date helpers", () => {
  test("todayIso uses UTC days", () => {
    expect(todayIso(Date.parse("2026-03-04T23:30:00.000Z"))).toBe("2026-03-04");
  });

  test("validates real ISO dates only", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("28-02-2026")).toBe(false);
  });

  test("adds days across month boundaries", () => {
    expect(addDaysIso("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("counts inclusive ranges", () => {
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
    expect(daysBetween("2026-01-01", "2026-01-05")).toBe(4);
  });

  test("detects overlapping ranges", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-05", "2026-01-05", "2026-01-08")).toBe(true);
    expect(rangesOverlap("2026-01-01", "2026-01-05", "2026-01-06", "2026-01-08")).toBe(false);
  });

  test("overdue is strictly after the end date", () => {
    const now = Date.parse("2026-05-10T12:00:00.000Z");
    expect(isOverdue("2026-05-09", now)).toBe(true);
    expect(isOverdue("2026-05-10", now)).toBe(false);
  });
});
