// The service layer (docs/SYSTEM_DESIGN.md §2.2): combines the repository (SQLite) with the
// pure definitions and time math to produce exactly the shapes the API returns (§4). Route
// handlers call these functions and do nothing else - this is the one place "active player"
// etc. are computed, so the summary, the weekly chart, and (later) drill-downs can't disagree.

import {
  getClub,
  getAllClubs,
  getClubSessions,
  getClubBookings,
  getClubPlayers,
} from "./repository";
import { resolveRange, previousRangeLabels, NOW, type DateLabel } from "./time";
import {
  computePeriodSummary,
  computeWeeklySeries,
  sessionsHeldInRange,
  activePlayerIdsInRange,
  noShowsInRange,
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

// Drill-down rows behind each of the three numbers (FR4). Each re-runs the same
// definitions.ts predicates the summary uses, so a session, player, or no-show that
// appears in a drill-down list is guaranteed to be one of the ones counted above.

export interface SessionSummary {
  sessionId: string;
  title: string;
  startsAt: string;
  attendanceRecorded: boolean;
}

export function getSessionsHeldDrilldown(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): SessionSummary[] | null {
  const club = getClub(clubId);
  if (!club) return null;

  const range = resolveRange(from, to, club.time_zone);
  const held = sessionsHeldInRange(getClubSessions(clubId), range, NOW);

  return held
    .map((s) => ({
      sessionId: s.session_id,
      title: s.title,
      startsAt: s.starts_at,
      attendanceRecorded: s.attendance_recorded === 1,
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export interface PlayerSummary {
  playerId: string;
  name: string;
}

export function getActivePlayersDrilldown(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): PlayerSummary[] | null {
  const club = getClub(clubId);
  if (!club) return null;

  const range = resolveRange(from, to, club.time_zone);
  const playerIds = activePlayerIdsInRange(
    getClubSessions(clubId),
    getClubBookings(clubId),
    range,
    NOW,
  );
  const nameById = new Map(
    getClubPlayers(clubId).map((p) => [p.player_id, p.name]),
  );

  return Array.from(playerIds)
    .map((playerId) => ({
      playerId,
      name: nameById.get(playerId) ?? "Unknown player",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface NoShowSummary {
  bookingId: string;
  sessionId: string;
  sessionTitle: string;
  startsAt: string;
  playerId: string;
  playerName: string;
}

export function getNoShowsDrilldown(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): NoShowSummary[] | null {
  const club = getClub(clubId);
  if (!club) return null;

  const sessions = getClubSessions(clubId);
  const range = resolveRange(from, to, club.time_zone);
  const { noShowBookings } = noShowsInRange(
    sessions,
    getClubBookings(clubId),
    range,
    NOW,
  );

  const sessionById = new Map(sessions.map((s) => [s.session_id, s]));
  const nameById = new Map(
    getClubPlayers(clubId).map((p) => [p.player_id, p.name]),
  );

  return noShowBookings
    .map((b) => {
      const session = sessionById.get(b.session_id);
      return {
        bookingId: b.booking_id,
        sessionId: b.session_id,
        sessionTitle: session?.title ?? "Unknown session",
        startsAt: session?.starts_at ?? "",
        playerId: b.player_id,
        playerName: nameById.get(b.player_id) ?? "Unknown player",
      };
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
