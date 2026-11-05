// Row shapes as stored in SQLite - the storage layer, not the API response shape
// (docs/SYSTEM_DESIGN.md §3.3 keeps those deliberately separate).

export interface ClubRow {
  club_id: string;
  name: string;
  time_zone: string;
  created_at: string;
}

export interface PlayerRow {
  player_id: string;
  club_id: string;
  name: string;
  joined_club_at: string;
}

export type SessionStatus = "scheduled" | "cancelled";

export interface SessionRow {
  session_id: string;
  club_id: string;
  title: string;
  starts_at: string; // ISO 8601, UTC
  duration_minutes: number;
  places: number;
  status: SessionStatus;
  attendance_recorded: 0 | 1;
}

export type BookingStatus = "booked" | "cancelled";

export interface BookingRow {
  booking_id: string;
  session_id: string;
  player_id: string;
  booked_at: string;
  status: BookingStatus;
  cancelled_at: string | null;
  attended: 0 | 1 | null; // null = attendance not recorded (unknown, not false)
}
