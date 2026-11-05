// The three numbers, defined once. Pure functions over in-memory rows - no DB access,
// which is what makes these directly unit-testable (definitions.test.ts). The service
// layer (index.ts) is the only thing that loads rows from SQLite and calls these; the API
// route handlers never compute anything themselves (docs/SYSTEM_DESIGN.md §2.2).

import type { SessionRow, BookingRow } from "../db/types";
import {
  type Range,
  weeksInRange,
  weekRangeFromLabel,
  type DateLabel,
} from "./time";

export const SESSIONS_HELD_DEFINITION =
  "Sessions that took place: scheduled, not cancelled, and already started.";

export const ACTIVE_PLAYERS_DEFINITION =
  "Players with a kept booking on a session that took place. If attendance wasn't tracked for that session, a booking that wasn't cancelled counts as played.";

export const NO_SHOWS_DEFINITION =
  "Bookings where the player didn't attend, counted only for sessions where attendance was tracked.";

function isWithin(instant: Date, range: Range): boolean {
  return instant >= range.startUtc && instant < range.endUtc;
}

/** Sessions that actually happened, in range: not cancelled, and already started by `now`. */
export function sessionsHeldInRange(
  sessions: SessionRow[],
  range: Range,
  now: Date,
): SessionRow[] {
  return sessions.filter((s) => {
    const startsAt = new Date(s.starts_at);
    return (
      s.status !== "cancelled" && isWithin(startsAt, range) && startsAt <= now
    );
  });
}

/**
 * Distinct players credited with playing a held session in range: attended=true, or
 * attendance wasn't recorded at all for that session (benefit of the doubt - see
 * ACTIVE_PLAYERS_DEFINITION and docs/SYSTEM_DESIGN.md §3.2).
 */
export function activePlayerIdsInRange(
  sessions: SessionRow[],
  bookings: BookingRow[],
  range: Range,
  now: Date,
): Set<string> {
  const held = sessionsHeldInRange(sessions, range, now);
  const heldById = new Map(held.map((s) => [s.session_id, s]));

  const playerIds = new Set<string>();
  for (const b of bookings) {
    if (b.status !== "booked") continue;
    const session = heldById.get(b.session_id);
    if (!session) continue;
    const countsAsPlayed =
      session.attendance_recorded === 0 || b.attended === 1;
    if (countsAsPlayed) playerIds.add(b.player_id);
  }
  return playerIds;
}

export interface NoShowResult {
  noShowBookings: BookingRow[];
  trackedSessionIds: Set<string>;
  heldSessionIds: Set<string>;
}

/**
 * No-show bookings in range, counted only over sessions where attendance was tracked.
 * `trackedSessionIds` and `heldSessionIds` let the caller show how much of the period
 * actually had attendance data - a no-show count without that context is misleading
 * (docs/SYSTEM_DESIGN.md §1.2, §3.2).
 */
export function noShowsInRange(
  sessions: SessionRow[],
  bookings: BookingRow[],
  range: Range,
  now: Date,
): NoShowResult {
  const held = sessionsHeldInRange(sessions, range, now);
  const heldSessionIds = new Set(held.map((s) => s.session_id));
  const trackedSessionIds = new Set(
    held.filter((s) => s.attendance_recorded === 1).map((s) => s.session_id),
  );

  const noShowBookings = bookings.filter(
    (b) =>
      b.status === "booked" &&
      trackedSessionIds.has(b.session_id) &&
      b.attended === 0,
  );

  return { noShowBookings, trackedSessionIds, heldSessionIds };
}

export interface MetricValue {
  value: number;
  previousValue: number;
  delta: number;
  deltaPct: number | null; // null when previousValue is 0 - a percentage change is undefined
  definition: string;
}

function toMetricValue(
  value: number,
  previousValue: number,
  definition: string,
): MetricValue {
  const delta = value - previousValue;
  const deltaPct = previousValue === 0 ? null : delta / previousValue;
  return { value, previousValue, delta, deltaPct, definition };
}

export interface PeriodSummary {
  activePlayers: MetricValue;
  sessionsHeld: MetricValue;
  noShows: MetricValue & { trackedSessions: number; totalSessions: number };
}

export function computePeriodSummary(
  sessions: SessionRow[],
  bookings: BookingRow[],
  range: Range,
  previousRange: Range,
  now: Date,
): PeriodSummary {
  const sessionsHeld = sessionsHeldInRange(sessions, range, now).length;
  const previousSessionsHeld = sessionsHeldInRange(
    sessions,
    previousRange,
    now,
  ).length;

  const activePlayers = activePlayerIdsInRange(
    sessions,
    bookings,
    range,
    now,
  ).size;
  const previousActivePlayers = activePlayerIdsInRange(
    sessions,
    bookings,
    previousRange,
    now,
  ).size;

  const noShows = noShowsInRange(sessions, bookings, range, now);
  const previousNoShows = noShowsInRange(
    sessions,
    bookings,
    previousRange,
    now,
  );

  return {
    sessionsHeld: toMetricValue(
      sessionsHeld,
      previousSessionsHeld,
      SESSIONS_HELD_DEFINITION,
    ),
    activePlayers: toMetricValue(
      activePlayers,
      previousActivePlayers,
      ACTIVE_PLAYERS_DEFINITION,
    ),
    noShows: {
      ...toMetricValue(
        noShows.noShowBookings.length,
        previousNoShows.noShowBookings.length,
        NO_SHOWS_DEFINITION,
      ),
      trackedSessions: noShows.trackedSessionIds.size,
      totalSessions: noShows.heldSessionIds.size,
    },
  };
}

export type MetricName = "activePlayers" | "sessionsHeld" | "noShows";

function metricValueForRange(
  sessions: SessionRow[],
  bookings: BookingRow[],
  metric: MetricName,
  range: Range,
  now: Date,
): number {
  switch (metric) {
    case "sessionsHeld":
      return sessionsHeldInRange(sessions, range, now).length;
    case "activePlayers":
      return activePlayerIdsInRange(sessions, bookings, range, now).size;
    case "noShows":
      return noShowsInRange(sessions, bookings, range, now).noShowBookings
        .length;
  }
}

export interface WeeklyPoint {
  weekStart: DateLabel;
  value: number;
}

/** One metric, bucketed into full Mon-Sun club-local weeks covering `range`. */
export function computeWeeklySeries(
  sessions: SessionRow[],
  bookings: BookingRow[],
  metric: MetricName,
  range: Range,
  timeZone: string,
  now: Date,
): WeeklyPoint[] {
  return weeksInRange(range, timeZone).map((weekStart) => {
    const weekRange = weekRangeFromLabel(weekStart, timeZone);
    return {
      weekStart,
      value: metricValueForRange(sessions, bookings, metric, weekRange, now),
    };
  });
}
