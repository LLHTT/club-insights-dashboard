// Shared metric metadata, deliberately not in a "use client" file: a plain constant
// exported from a client component doesn't survive being imported into a Server Component
// for logic (e.g. .includes()) - only its rendered JSX usage crosses that boundary cleanly.

import type { MetricName } from "./metrics/definitions";

export const METRIC_LABELS: Record<MetricName, string> = {
  activePlayers: "Active players",
  sessionsHeld: "Sessions held",
  noShows: "No-shows",
};

export const METRIC_NAMES = Object.keys(METRIC_LABELS) as MetricName[];
