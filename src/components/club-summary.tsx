"use client";

// Container layer (docs/SYSTEM_DESIGN.md §2.4): fetches, owns loading/error state, hands
// plain props to the presentational KpiCard. Query key is [clubId, from, to] per §2.5 - a
// new date range or club is a new cache entry, not a mutation of this one.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSummary, ApiClientError } from "@/lib/api-client";
import type { DateLabel } from "@/lib/metrics/time";
import type { MetricName, PeriodSummary } from "@/lib/metrics/definitions";
import { KpiCard } from "./kpi-card";
import { DrilldownSheet } from "./drilldown-sheet";
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

  // Which drill-down sheet is open, if any (FR4) - ephemeral UI state, not URL state
  // (docs/SYSTEM_DESIGN.md §2.5).
  const [openMetric, setOpenMetric] = useState<MetricName | null>(null);

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
      <KpiCard
        label="Active players"
        metric={data.metrics.activePlayers}
        onViewDetails={() => setOpenMetric("activePlayers")}
      />
      <KpiCard
        label="Sessions held"
        metric={data.metrics.sessionsHeld}
        onViewDetails={() => setOpenMetric("sessionsHeld")}
      />
      <KpiCard
        label="No-shows"
        metric={data.metrics.noShows}
        footnote={noShowFootnote(data.metrics.noShows)}
        goodDirection="down"
        onViewDetails={() => setOpenMetric("noShows")}
      />
      {openMetric && (
        <DrilldownSheet
          metric={openMetric}
          clubId={clubId}
          from={from}
          to={to}
          open={openMetric !== null}
          onOpenChange={(next) => {
            if (!next) setOpenMetric(null);
          }}
        />
      )}
    </div>
  );
}
