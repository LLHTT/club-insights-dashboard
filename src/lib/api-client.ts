// The one place the frontend calls the JSON API (docs/SYSTEM_DESIGN.md §2.1, §2.4) - no
// component fetches with a raw `fetch` call. Response types are imported directly from
// src/lib/metrics rather than re-declared, since the route handlers (src/app/api) return
// exactly those types unchanged.

import type {
  ClubSummary,
  PeriodSummaryResult,
  WeeklySeriesResult,
  SessionSummary,
  PlayerSummary,
  NoShowSummary,
} from "./metrics";
import type { MetricName } from "./metrics/definitions";
import type { DateLabel } from "./metrics/time";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const query = new URLSearchParams(params);
  const url = query.size > 0 ? `${path}?${query}` : path;

  const res = await fetch(url);
  if (!res.ok) {
    const body: { error?: { code?: string; message?: string } } | null =
      await res.json().catch(() => null);
    throw new ApiClientError(
      res.status,
      body?.error?.code ?? "internal_error",
      body?.error?.message ?? "Request failed",
    );
  }
  return res.json();
}

function clubPath(clubId: string, segment: string): string {
  return `/api/clubs/${encodeURIComponent(clubId)}/${segment}`;
}

export function fetchClubs(): Promise<ClubSummary[]> {
  return getJson("/api/clubs", {});
}

export function fetchSummary(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): Promise<PeriodSummaryResult> {
  return getJson(clubPath(clubId, "summary"), { from, to });
}

export function fetchWeekly(
  clubId: string,
  metric: MetricName,
  from: DateLabel,
  to: DateLabel,
): Promise<WeeklySeriesResult> {
  return getJson(clubPath(clubId, "weekly"), { metric, from, to });
}

export function fetchSessionsDrilldown(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): Promise<{ sessions: SessionSummary[] }> {
  return getJson(clubPath(clubId, "sessions"), { from, to });
}

export function fetchPlayersDrilldown(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): Promise<{ players: PlayerSummary[] }> {
  return getJson(clubPath(clubId, "players"), { from, to });
}

export function fetchNoShowsDrilldown(
  clubId: string,
  from: DateLabel,
  to: DateLabel,
): Promise<{ noShows: NoShowSummary[] }> {
  return getJson(clubPath(clubId, "no-shows"), { from, to });
}
