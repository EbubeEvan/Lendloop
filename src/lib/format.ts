import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from "date-fns";

export function formatIsoDay(value: string): string {
  return format(parseISO(`${value}T00:00:00`), "MMM d, yyyy");
}

export function formatIsoRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatIsoDay(startDate);
  }
  return `${formatIsoDay(startDate)} – ${formatIsoDay(endDate)}`;
}

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatRelative(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function loanLength(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
