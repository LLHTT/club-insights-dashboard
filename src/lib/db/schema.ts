// Storage shape mirrors the CSVs, as described in docs/SYSTEM_DESIGN.md §3.1.
// All timestamps are stored as ISO 8601 strings in UTC, exactly as given in the source data.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS clubs (
  club_id    TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  time_zone  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  player_id       TEXT PRIMARY KEY,
  club_id         TEXT NOT NULL REFERENCES clubs(club_id),
  name            TEXT NOT NULL,
  joined_club_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id           TEXT PRIMARY KEY,
  club_id              TEXT NOT NULL REFERENCES clubs(club_id),
  title                TEXT NOT NULL,
  starts_at            TEXT NOT NULL,
  duration_minutes     INTEGER NOT NULL,
  places               INTEGER NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled')),
  attendance_recorded  INTEGER NOT NULL CHECK (attendance_recorded IN (0, 1))
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id    TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(session_id),
  player_id     TEXT NOT NULL REFERENCES players(player_id),
  booked_at     TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('booked', 'cancelled')),
  cancelled_at  TEXT,
  attended      INTEGER CHECK (attended IN (0, 1)) -- NULL = attendance not recorded (unknown, not false)
);

CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_sessions_club_starts ON sessions(club_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_player ON bookings(player_id);
`;
