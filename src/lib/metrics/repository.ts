// The only place that queries SQLite for metrics. Everything above this (definitions.ts,
// time.ts) is pure and DB-free on purpose. For this dataset's size, loading a whole club's
// sessions/bookings into memory and filtering in JS is simpler and fast enough - see
// docs/SYSTEM_DESIGN.md §2.8 for what would change at real scale.

import { getDb } from "../db";
import type { ClubRow, SessionRow, BookingRow, PlayerRow } from "../db/types";

export function getClub(clubId: string): ClubRow | undefined {
  return getDb()
    .prepare("SELECT * FROM clubs WHERE club_id = ?")
    .get(clubId) as ClubRow | undefined;
}

export function getAllClubs(): ClubRow[] {
  return getDb()
    .prepare("SELECT * FROM clubs ORDER BY created_at")
    .all() as ClubRow[];
}

export function getClubSessions(clubId: string): SessionRow[] {
  return getDb()
    .prepare("SELECT * FROM sessions WHERE club_id = ?")
    .all(clubId) as SessionRow[];
}

export function getClubBookings(clubId: string): BookingRow[] {
  return getDb()
    .prepare(
      `SELECT b.* FROM bookings b
       JOIN sessions s ON s.session_id = b.session_id
       WHERE s.club_id = ?`,
    )
    .all(clubId) as BookingRow[];
}

export function getClubPlayers(clubId: string): PlayerRow[] {
  return getDb()
    .prepare("SELECT * FROM players WHERE club_id = ?")
    .all(clubId) as PlayerRow[];
}
