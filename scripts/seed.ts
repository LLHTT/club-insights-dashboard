// Loads data/*.csv into the SQLite file at DATABASE_PATH (default: club-insights.sqlite
// in the project root). Safe to re-run: it rebuilds the four tables from scratch each time,
// so the database always matches the checked-in CSVs exactly.
//
// The CSVs here have no quoted or comma-containing fields (checked by hand against the
// source data), so a plain split on "," is enough - no CSV parsing library needed.

import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import type {
  ClubRow,
  PlayerRow,
  SessionRow,
  BookingRow,
} from "../src/lib/db/types";

const DATA_DIR = path.join(process.cwd(), "data");

function readCsv(fileName: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, fileName), "utf-8").trim();
  const [headerLine, ...lines] = raw.split(/\r\n|\n/);
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });
    return row;
  });
}

function toBit(value: string): 0 | 1 {
  return value === "true" ? 1 : 0;
}

function toNullableBit(value: string): 0 | 1 | null {
  if (value === "") return null;
  return value === "true" ? 1 : 0;
}

function toNullable(value: string): string | null {
  return value === "" ? null : value;
}

function seed() {
  const db = getDb();

  const clubs = readCsv("clubs.csv") as unknown as Array<
    Record<keyof ClubRow, string>
  >;
  const players = readCsv("players.csv") as unknown as Array<
    Record<keyof PlayerRow, string>
  >;
  const sessions = readCsv("sessions.csv");
  const bookings = readCsv("bookings.csv");

  const run = db.transaction(() => {
    db.exec(
      "DELETE FROM bookings; DELETE FROM sessions; DELETE FROM players; DELETE FROM clubs;",
    );

    const insertClub = db.prepare<ClubRow>(
      `INSERT INTO clubs (club_id, name, time_zone, created_at)
       VALUES (@club_id, @name, @time_zone, @created_at)`,
    );
    for (const c of clubs) insertClub.run(c);

    const insertPlayer = db.prepare<PlayerRow>(
      `INSERT INTO players (player_id, club_id, name, joined_club_at)
       VALUES (@player_id, @club_id, @name, @joined_club_at)`,
    );
    for (const p of players) insertPlayer.run(p);

    const insertSession = db.prepare<SessionRow>(
      `INSERT INTO sessions (session_id, club_id, title, starts_at, duration_minutes, places, status, attendance_recorded)
       VALUES (@session_id, @club_id, @title, @starts_at, @duration_minutes, @places, @status, @attendance_recorded)`,
    );
    for (const s of sessions) {
      insertSession.run({
        session_id: s.session_id,
        club_id: s.club_id,
        title: s.title,
        starts_at: s.starts_at,
        duration_minutes: Number(s.duration_minutes),
        places: Number(s.places),
        status: s.status as SessionRow["status"],
        attendance_recorded: toBit(s.attendance_recorded),
      });
    }

    const insertBooking = db.prepare<BookingRow>(
      `INSERT INTO bookings (booking_id, session_id, player_id, booked_at, status, cancelled_at, attended)
       VALUES (@booking_id, @session_id, @player_id, @booked_at, @status, @cancelled_at, @attended)`,
    );
    for (const b of bookings) {
      insertBooking.run({
        booking_id: b.booking_id,
        session_id: b.session_id,
        player_id: b.player_id,
        booked_at: b.booked_at,
        status: b.status as BookingRow["status"],
        cancelled_at: toNullable(b.cancelled_at),
        attended: toNullableBit(b.attended),
      });
    }
  });

  run();

  const counts = {
    clubs: db.prepare("SELECT COUNT(*) AS n FROM clubs").get() as { n: number },
    players: db.prepare("SELECT COUNT(*) AS n FROM players").get() as {
      n: number;
    },
    sessions: db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as {
      n: number;
    },
    bookings: db.prepare("SELECT COUNT(*) AS n FROM bookings").get() as {
      n: number;
    },
  };

  console.log("Seeded:", {
    clubs: counts.clubs.n,
    players: counts.players.n,
    sessions: counts.sessions.n,
    bookings: counts.bookings.n,
  });
}

seed();
