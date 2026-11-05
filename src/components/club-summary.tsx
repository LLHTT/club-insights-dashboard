"use client";

// Container layer (docs/SYSTEM_DESIGN.md §2.4): fetches, owns loading/error state, hands
// plain props to the presentational KpiCard. Query key is [clubId, from, to] per §2.5 - a
// new date range or club is a new cache entry, not a mutation of this one.

import { useQuery } from "@tanstack/react-query";
import { fetchSummary, ApiClientError } from "@/lib/api-client";
import type { DateLabel } from "@/lib/metrics/time";
import type { PeriodSummary } from "@/lib/metrics/definitions";
import { KpiCard } from "./kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

function noShowFootnote(noShows: PeriodSummary["noShows"]): string | undefined {
  if (noShows.totalSessions === 0) return undefined;
  return `${noShows.trackedSessions} of ${noShows.totalSessions} sessions held had attendance tracked`;
}

export function ClubSummary({
  clubId,
  from,
  to,
}: {
  clubId: string;
  from: DateLabel;
  to: DateLabel;
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["summary", clubId, from, to],
    queryFn: () => fetchSummary(clubId, from, to),
  });

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load this club&apos;s summary
        {error instanceof ApiClientError ? `: ${error.message}` : "."}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard label="Active players" metric={data.metrics.activePlayers} />
      <KpiCard label="Sessions held" metric={data.metrics.sessionsHeld} />
      <KpiCard
        label="No-shows"
        metric={data.metrics.noShows}
        footnote={noShowFootnote(data.metrics.noShows)}
        goodDirection="down"
      />
    </div>
  );
}
