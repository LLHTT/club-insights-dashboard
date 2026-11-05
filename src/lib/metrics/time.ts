// Timezone-aware date range and week-bucketing math. Pure functions only - no DB access
// here, so this is directly unit-testable (see definitions.test.ts).
//
// The pattern used throughout: `from`/`to` and week starts are plain "YYYY-MM-DD" calendar
// labels, converted to real UTC instants only at the point where we need to compare against
// a session's starts_at. Keeping the two kinds of value (calendar label vs. UTC instant)
// distinct in the types below is deliberate - mixing them is exactly how timezone bugs like
// the s0001 case (docs/SYSTEM_DESIGN.md §3.1) happen.

import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfWeek, format } from "date-fns";

// "Now" for the whole exercise is pinned to Mon 5 Oct 2026, 09:00 in Asia/Ho_Chi_Minh
// (UTC+7), per the brief - not the system clock.
export const NOW = new Date("2026-10-05T02:00:00Z");

export type DateLabel = string; // "YYYY-MM-DD", in some club's local calendar

export interface Range {
  startUtc: Date;
  endUtc: Date; // exclusive
}

export interface RangeLabels {
  from: DateLabel;
  to: DateLabel;
}

/** Add (or subtract) whole calendar days to a "YYYY-MM-DD" label. Pure calendar math. */
export function addDaysToLabel(label: DateLabel, days: number): DateLabel {
  const [y, m, d] = label.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return formatLabel(date);
}

function formatLabel(date: Date): DateLabel {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetweenLabels(from: DateLabel, to: DateLabel): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const msPerDay = 24 * 60 * 60 * 1000;
  return (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / msPerDay;
}

/** Converts a club-local calendar range (inclusive from/to) to a half-open UTC instant range. */
export function resolveRange(
  from: DateLabel,
  to: DateLabel,
  timeZone: string,
): Range {
  const startUtc = fromZonedTime(`${from}T00:00:00`, timeZone);
  const endUtc = fromZonedTime(`${addDaysToLabel(to, 1)}T00:00:00`, timeZone);
  return { startUtc, endUtc };
}

/**
 * A sensible initial date range for the dashboard: the 4 weeks up to and including
 * yesterday, before any host picks their own range. Uses the UTC calendar day rather than
 * a club's local day - this is a UI convenience, not a reported number, so it doesn't need
 * a club's time zone to compute.
 */
export function defaultRangeLabels(now: Date): RangeLabels {
  const to = formatLabel(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const from = addDaysToLabel(to, -27);
  return { from, to };
}

/** The equal-length period immediately before [from, to], as calendar labels (no gap). */
export function previousRangeLabels(
  from: DateLabel,
  to: DateLabel,
): RangeLabels {
  const lengthInDays = daysBetweenLabels(from, to) + 1;
  const prevTo = addDaysToLabel(from, -1);
  const prevFrom = addDaysToLabel(prevTo, -(lengthInDays - 1));
  return { from: prevFrom, to: prevTo };
}

/** The Monday (club-local) of the week containing this UTC instant, as a "YYYY-MM-DD" label. */
export function weekStartLabel(
  instant: Date | string,
  timeZone: string,
): DateLabel {
  const zoned = toZonedTime(instant, timeZone);
  const monday = startOfWeek(zoned, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

/** The UTC instant range [start, end) of the Mon-Sun week starting on this label. */
export function weekRangeFromLabel(
  weekStart: DateLabel,
  timeZone: string,
): Range {
  return resolveRange(weekStart, addDaysToLabel(weekStart, 6), timeZone);
}

/** Every week-start label (Monday) for the weeks that overlap this range. */
export function weeksInRange(range: Range, timeZone: string): DateLabel[] {
  const firstWeek = weekStartLabel(range.startUtc, timeZone);
  const lastWeek = weekStartLabel(
    new Date(range.endUtc.getTime() - 1),
    timeZone,
  );
  const labels: DateLabel[] = [];
  for (
    let cursor = firstWeek;
    cursor <= lastWeek;
    cursor = addDaysToLabel(cursor, 7)
  ) {
    labels.push(cursor);
  }
  return labels;
}
