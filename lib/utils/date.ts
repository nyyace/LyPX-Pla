/**
 * LyPX Date Utilities
 *
 * Storage:  All timestamps stored in UTC (Railway Postgres default — do not change)
 * Display:  Always render in the user's selected timezone
 * Default:  Asia/Singapore (SGT, UTC+8) — primary market
 * Cron:     All scheduled jobs use UTC times; comments document SGT equivalent
 *
 * This utility is the single source of truth for all date formatting and
 * arithmetic across every LyPX client surface. Never call toLocaleString(),
 * toISOString(), or toLocaleDateString() directly in UI components.
 */

// Supported timezones — extend as LyPX expands to new regions
export const SUPPORTED_TIMEZONES = [
  { label: "Singapore (SGT, UTC+8)", value: "Asia/Singapore" },
  { label: "Kuala Lumpur (MYT, UTC+8)", value: "Asia/Kuala_Lumpur" },
  { label: "Bangkok (ICT, UTC+7)", value: "Asia/Bangkok" },
  { label: "Jakarta (WIB, UTC+7)", value: "Asia/Jakarta" },
  { label: "Hong Kong (HKT, UTC+8)", value: "Asia/Hong_Kong" },
  { label: "UTC", value: "UTC" },
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number]["value"];
export const DEFAULT_TIMEZONE: SupportedTimezone = "Asia/Singapore";

// Format a UTC date to a display string in the given timezone
export function formatTZ(
  date: Date | string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE,
  opts?: {
    dateStyle?: "short" | "medium" | "long" | "full";
    timeStyle?: "short" | "medium" | "long";
  }
): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-SG", {
    timeZone: timezone,
    dateStyle: opts?.dateStyle ?? "medium",
    timeStyle: opts?.timeStyle ?? "short",
  });
}

// Date only (no time component)
export function formatTZDate(
  date: Date | string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-SG", {
    timeZone: timezone,
    dateStyle: "medium",
  });
}

// Time only (no date component)
export function formatTZTime(
  date: Date | string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-SG", {
    timeZone: timezone,
    timeStyle: "short",
  });
}

// Days remaining until a future date (timezone-independent — uses UTC diff)
export function daysUntil(future: Date | string | null | undefined): number {
  if (!future) return 0;
  const diffMs = new Date(future).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Days since a past date (timezone-independent — uses UTC diff)
export function daysSince(past: Date | string | null | undefined): number {
  if (!past) return 0;
  const diffMs = Date.now() - new Date(past).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Check if a date is within N days from now
export function isWithinDays(
  date: Date | string | null | undefined,
  days: number
): boolean {
  const d = daysUntil(date);
  return d >= 0 && d <= days;
}

// Check if a date is in the past
export function isExpired(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

// Years elapsed since a past date
export function yearsSince(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const diffMs = Date.now() - new Date(date).getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

// Add days to a date (returns UTC Date — store directly in DB)
export function addDays(date: Date | string, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Add months to a date (returns UTC Date — store directly in DB)
export function addMonths(date: Date | string, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
