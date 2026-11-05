"use client";

// FR6: the club with no data gets a real page, not a broken one. The KPI cards and chart
// already degrade safely to zeros (no crash, no NaN), but a host looking at three "no data"
// cards plus a flat zero chart might reasonably wonder if they picked the wrong date range.
// Using the hasData flag from /api/clubs (docs/SYSTEM_DESIGN.md §4) to show a deliberate
// empty state instead removes that ambiguity: this club has never had a session, no date
// range would show anything different.

import { useQuery } from "@tanstack/react-query";
import { fetchClubs } from "@/lib/api-client";
import { ClubSummary } from "./club-summary";
import { MetricToggle } from "./metric-toggle";
import { WeeklyChart } from "./weekly-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { DateLabel } from "@/lib/metrics/time";
import type { MetricName } from "@/lib/metrics/definitions";

export function ClubDashboard({
  clubId,
  from,
  to,
  metric,
}: {
  clubId: string;
  from: DateLabel;
  to: DateLabel;
  metric: MetricName;
}) {
  // Same query key as ClubSwitcher's fetchClubs() - TanStack Query dedupes this to the
  // one request already in flight for the header, not a second one.
  const { data, isPending } = useQuery({
    queryKey: ["clubs"],
    queryFn: fetchClubs,
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const club = data?.find((c) => c.clubId === clubId);

  if (club && !club.hasData) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No data yet for {club.name}</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          This club has no sessions recorded in the system, so there&apos;s
          nothing to show here yet - no date range will change that.
        </p>
      </div>
    );
  }

  return (
    <>
      <ClubSummary clubId={clubId} from={from} to={to} />
      <div className="flex flex-col gap-3">
        <MetricToggle metric={metric} />
        <WeeklyChart clubId={clubId} metric={metric} from={from} to={to} />
      </div>
    </>
  );
}
