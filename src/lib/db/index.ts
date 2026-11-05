import Database from "better-sqlite3";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";

const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "club-insights.sqlite");

let instance: Database.Database | null = null;

// A single shared connection, created on first use. better-sqlite3 is
// synchronous, so there's no async connection pool to manage - see
// docs/SYSTEM_DESIGN.md §2.1/§2.2 for why the service layer sits on top
// of this rather than every route handler querying ad hoc.
export function getDb(): Database.Database {
  if (!instance) {
    instance = new Database(DATABASE_PATH);
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    instance.exec(SCHEMA_SQL);
  }
  return instance;
}

export { DATABASE_PATH };
