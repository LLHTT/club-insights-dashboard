// The service layer (docs/SYSTEM_DESIGN.md §2.2): combines the repository (SQLite) with the
// pure definitions and time math to produce exactly the shapes the API returns (§4). Route
// handlers call these functions and do nothing else - this is the one place "active player"
// etc. are computed, so the summary, the weekly chart, and (later) drill-downs can't disagree.

import {
  getClub,
  getAllClubs,
  getClubSessions,
  getClubBookings,
} from "./repository";
import { resolveRange, previousRangeLabels, NOW, type DateLabel } from "./time";
import {
  computePeriodSummary,
  computeWeeklySeries,
  type PeriodSummary,
  type WeeklyPoint,
  type MetricName,
} from "./definitions";

export interface ClubSummary {
  clubId: string;
  name: string;
  timeZone: string;
  hasData: boolean;
}

export function listClubs(): ClubSummary[] {
  return getAllClubs().map((club) => ({
    clubId: club.club_id,
    name: club.name,
    timeZone: club.time_zone,
    hasData: getClubSessions(club.club_id).length > 0,
  }));
}

export interface PeriodSummaryResult {
  range: { from: DateLabel; to: DateLabel };
  previousRange: { from: DateLabel; to: DateLabel };
  metrics: PeriodSummary;
}

export function getPeriodSummary(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): PeriodSummaryResult | null {
  const club = getClub(clubId);
  if (!club) return null;

  const sessions = getClubSessions(clubId);
  const bookings = getClubBookings(clubId);

  const previous = previousRangeLabels(from, to);
  const range = resolveRange(from, to, club.time_zone);
  const previousRange = resolveRange(
    previous.from,
    previous.to,
    club.time_zone,
  );

  return {
    range: { from, to },
    previousRange: previous,
    metrics: computePeriodSummary(
      sessions,
      bookings,
      range,
      previousRange,
      NOW,
    ),
  };
}

export interface WeeklySeriesResult {
  metric: MetricName;
  points: WeeklyPoint[];
}

export function getWeeklySeries(
  clubId: string,
  metric: MetricName,
  from: DateLabel,
  to: DateLabel,
): WeeklySeriesResult | null {
  const club = getClub(clubId);
  if (!club) return null;

  const sessions = getClubSessions(clubId);
  const bookings = getClubBookings(clubId);
  const range = resolveRange(from, to, club.time_zone);

  return {
    metric,
    points: computeWeeklySeries(
      sessions,
      bookings,
      metric,
      range,
      club.time_zone,
      NOW,
    ),
  };
}

export {
  SESSIONS_HELD_DEFINITION,
  ACTIVE_PLAYERS_DEFINITION,
  NO_SHOWS_DEFINITION,
} from "./definitions";
