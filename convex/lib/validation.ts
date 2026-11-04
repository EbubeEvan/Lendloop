import { daysBetween, isValidDateString, todayIso } from "./dates";
import { appError } from "./errors";

export const LIMITS = {
  toolNameMin: 2,
  toolNameMax: 80,
  toolDescriptionMin: 10,
  toolDescriptionMax: 500,
  requestNoteMax: 400,
  maxLoanDays: 30,
  maxAdvanceDays: 120,
  maxActiveListings: 25,
  maxPendingRequests: 5,
  maxRequestsPerDay: 20,
} as const;

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateToolInput(input: { name: string; description: string }): {
  name: string;
  description: string;
} {
  const name = normalizeText(input.name);
  const description = input.description.trim();

  if (name.length < LIMITS.toolNameMin || name.length > LIMITS.toolNameMax) {
    appError(
      "INVALID_INPUT",
      `Tool name must be between ${LIMITS.toolNameMin} and ${LIMITS.toolNameMax} characters.`,
    );
  }
  if (
    description.length < LIMITS.toolDescriptionMin ||
    description.length > LIMITS.toolDescriptionMax
  ) {
    appError(
      "INVALID_INPUT",
      `Description must be between ${LIMITS.toolDescriptionMin} and ${LIMITS.toolDescriptionMax} characters.`,
    );
  }

  return { name, description };
}

export function validateRequestDates(
  startDate: string,
  endDate: string,
  now: number = Date.now(),
): void {
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    appError("INVALID_INPUT", "Choose a valid start and end date.");
  }

  const today = todayIso(now);
  if (startDate < today) {
    appError("INVALID_INPUT", "The start date cannot be in the past.");
  }
  if (endDate < startDate) {
    appError("INVALID_INPUT", "The end date must be on or after the start date.");
  }

  const duration = daysBetween(startDate, endDate) + 1;
  if (duration > LIMITS.maxLoanDays) {
    appError("INVALID_INPUT", `Loans can last at most ${LIMITS.maxLoanDays} days.`);
  }

  const latestStart = new Date(Date.parse(`${today}T00:00:00.000Z`) + LIMITS.maxAdvanceDays * 864e5)
    .toISOString()
    .slice(0, 10);
  if (startDate > latestStart) {
    appError("INVALID_INPUT", `Requests can be made at most ${LIMITS.maxAdvanceDays} days ahead.`);
  }
}

export function validateNote(note: string | undefined): string | undefined {
  if (!note) {
    return undefined;
  }
  const trimmed = note.trim();
  if (trimmed.length > LIMITS.requestNoteMax) {
    appError("INVALID_INPUT", `Notes must be ${LIMITS.requestNoteMax} characters or fewer.`);
  }
  return trimmed.length > 0 ? trimmed : undefined;
}
