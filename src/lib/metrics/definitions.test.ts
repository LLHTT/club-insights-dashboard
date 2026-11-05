// The number most likely to be wrong (docs/SYSTEM_DESIGN.md §5): no-shows crossed with
// week bucketing. Covers the two traps the brief calls out directly - "no-shows are unknown,
// not zero", and "weeks run Monday to Sunday in the club's time zone" - plus the closely
// related active-players and sessions-held logic, which share the same held-session base.
//
// All fixtures are hand-built, no database involved - these are pure functions over plain
// objects.

import { describe, it, expect } from "vitest";
import {
  sessionsHeldInRange,
  activePlayerIdsInRange,
  noShowsInRange,
} from "./definitions";
import { resolveRange, previousRangeLabels, weekStartLabel } from "./time";
import type { SessionRow, BookingRow } from "../db/types";

const CLUB_TZ = "Asia/Ho_Chi_Minh";
const NOW = new Date("2026-10-05T02:00:00Z"); // Mon 5 Oct 2026, 09:00 ICT

function session(
  overrides: Partial<SessionRow> & Pick<SessionRow, "session_id">,
): SessionRow {
  return {
    club_id: "club-001",
    title: "Test session",
    starts_at: "2026-01-06T12:00:00Z",
    duration_minutes: 90,
    places: 12,
    status: "scheduled",
    attendance_recorded: 1,
    ...overrides,
  };
}

function booking(
  overrides: Partial<BookingRow> &
    Pick<BookingRow, "booking_id" | "session_id">,
): BookingRow {
  return {
    player_id: "p001",
    booked_at: "2026-01-01T00:00:00Z",
    status: "booked",
    cancelled_at: null,
    attended: null,
    ...overrides,
  };
}

const JANUARY = resolveRange("2026-01-01", "2026-01-31", CLUB_TZ);

describe("week bucketing", () => {
  it("buckets a session by its club-local calendar day, not its UTC calendar day (s0001 case)", () => {
    // 2026-01-04T22:30:00Z is a Sunday in UTC, but Monday 05:30 in Asia/Ho_Chi_Minh (UTC+7) -
    // a real row in the seed data, not a hypothetical. The naive bug is bucketing this into
    // the week of 2025-12-29 (the UTC Sunday's week) instead of 2026-01-05.
    const label = weekStartLabel("2026-01-04T22:30:00Z", CLUB_TZ);
    expect(label).toBe("2026-01-05");
  });

  it("keeps a session that's UTC-Monday and club-local-Monday in the same week either way", () => {
    const label = weekStartLabel("2026-01-05T01:00:00Z", CLUB_TZ); // Mon 08:00 ICT
    expect(label).toBe("2026-01-05");
  });

  it("computes the previous period as equal length with no gap", () => {
    const prev = previousRangeLabels("2026-09-08", "2026-09-14"); // 7 days, Mon-Sun
    expect(prev).toEqual({ from: "2026-09-01", to: "2026-09-07" });
  });
});

describe("sessions held", () => {
  it("excludes cancelled sessions", () => {
    const sessions = [session({ session_id: "s1", status: "cancelled" })];
    expect(sessionsHeldInRange(sessions, JANUARY, NOW)).toHaveLength(0);
  });

  it("excludes sessions that haven't happened yet relative to now", () => {
    const future = resolveRange("2026-10-01", "2026-10-31", CLUB_TZ);
    const sessions = [
      session({ session_id: "s1", starts_at: "2026-10-20T12:00:00Z" }),
    ];
    expect(sessionsHeldInRange(sessions, future, NOW)).toHaveLength(0);
  });

  it("includes a scheduled session that already happened, in range", () => {
    const sessions = [
      session({ session_id: "s1", starts_at: "2026-01-06T12:00:00Z" }),
    ];
    expect(sessionsHeldInRange(sessions, JANUARY, NOW)).toHaveLength(1);
  });
});

describe("active players", () => {
  it("counts a player whose session had no attendance tracking, as long as the booking wasn't cancelled", () => {
    const sessions = [session({ session_id: "s1", attendance_recorded: 0 })];
    const bookings = [
      booking({ booking_id: "b1", session_id: "s1", player_id: "p001" }),
    ];
    const active = activePlayerIdsInRange(sessions, bookings, JANUARY, NOW);
    expect(active.has("p001")).toBe(true);
  });

  it("excludes a player whose booking was cancelled, even with no attendance tracking", () => {
    const sessions = [session({ session_id: "s1", attendance_recorded: 0 })];
    const bookings = [
      booking({
        booking_id: "b1",
        session_id: "s1",
        player_id: "p001",
        status: "cancelled",
      }),
    ];
    const active = activePlayerIdsInRange(sessions, bookings, JANUARY, NOW);
    expect(active.has("p001")).toBe(false);
  });

  it("excludes a player marked attended=false at a tracked session", () => {
    const sessions = [session({ session_id: "s1", attendance_recorded: 1 })];
    const bookings = [
      booking({
        booking_id: "b1",
        session_id: "s1",
        player_id: "p001",
        attended: 0,
      }),
    ];
    const active = activePlayerIdsInRange(sessions, bookings, JANUARY, NOW);
    expect(active.has("p001")).toBe(false);
  });
});

describe("no-shows", () => {
  it("excludes sessions without attendance tracking from both the count and the denominator", () => {
    const sessions = [session({ session_id: "s1", attendance_recorded: 0 })];
    // In real data a booking at an untracked session always has attended = null, but the
    // predicate should filter by the session's tracking status, not just the booking value -
    // this fixture would only pass by coincidence if it didn't.
    const bookings = [
      booking({
        booking_id: "b1",
        session_id: "s1",
        player_id: "p001",
        attended: null,
      }),
    ];
    const result = noShowsInRange(sessions, bookings, JANUARY, NOW);
    expect(result.noShowBookings).toHaveLength(0);
    expect(result.trackedSessionIds.size).toBe(0);
    expect(result.heldSessionIds.size).toBe(1); // still held, just not tracked
  });

  it("never counts a cancelled booking as a no-show, even if attended is somehow false", () => {
    const sessions = [session({ session_id: "s1", attendance_recorded: 1 })];
    const bookings = [
      booking({
        booking_id: "b1",
        session_id: "s1",
        player_id: "p001",
        status: "cancelled",
        attended: 0,
      }),
    ];
    const result = noShowsInRange(sessions, bookings, JANUARY, NOW);
    expect(result.noShowBookings).toHaveLength(0);
  });

  it("counts a kept booking marked attended=false at a tracked session", () => {
    const sessions = [session({ session_id: "s1", attendance_recorded: 1 })];
    const bookings = [
      booking({
        booking_id: "b1",
        session_id: "s1",
        player_id: "p001",
        attended: 0,
      }),
    ];
    const result = noShowsInRange(sessions, bookings, JANUARY, NOW);
    expect(result.noShowBookings).toHaveLength(1);
    expect(result.trackedSessionIds.size).toBe(1);
  });
});
