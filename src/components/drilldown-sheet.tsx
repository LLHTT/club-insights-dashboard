"use client";

// Drill-down panel (FR4): clicking a KPI number shows the sessions/players/no-shows behind
// it. Fetched lazily - only once the sheet is open (docs/SYSTEM_DESIGN.md §2.6), not
// pre-fetched for all three on page load. Open/closed is local state (§2.5), owned by
// ClubSummary.

import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchSessionsDrilldown,
  fetchPlayersDrilldown,
  fetchNoShowsDrilldown,
  ApiClientError,
} from "@/lib/api-client";
import type { DateLabel } from "@/lib/metrics/time";
import type { MetricName } from "@/lib/metrics/definitions";
import { METRIC_LABELS } from "@/lib/metric-labels";
import { DISPLAY_TIME_ZONE } from "@/lib/display-timezone";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

function formatStartsAt(startsAt: string): string {
  return startsAt ? dateFormatter.format(new Date(startsAt)) : "Unknown";
}

function DrilldownError({ error }: { error: unknown }) {
  return (
    <p className="text-destructive px-4 text-sm">
      Couldn&apos;t load this list
      {error instanceof ApiClientError ? `: ${error.message}` : "."}
    </p>
  );
}

function EmptyNotice({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground px-4 text-sm">No {label} in range.</p>
  );
}

function SessionsTable({
  clubId,
  from,
  to,
}: {
  clubId: string;
  from: DateLabel;
  to: DateLabel;
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["sessions", "drilldown", clubId, from, to],
    queryFn: () => fetchSessionsDrilldown(clubId, from, to),
  });

  if (isPending) return <Skeleton className="mx-4 h-40" />;
  if (isError) return <DrilldownError error={error} />;
  if (data.sessions.length === 0) return <EmptyNotice label="sessions" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Attendance tracked</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.sessions.map((s) => (
          <TableRow key={s.sessionId}>
            <TableCell>{s.title}</TableCell>
            <TableCell>{formatStartsAt(s.startsAt)}</TableCell>
            <TableCell>{s.attendanceRecorded ? "Yes" : "No"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PlayersTable({
  clubId,
  from,
  to,
}: {
  clubId: string;
  from: DateLabel;
  to: DateLabel;
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["players", "drilldown", clubId, from, to],
    queryFn: () => fetchPlayersDrilldown(clubId, from, to),
  });

  if (isPending) return <Skeleton className="mx-4 h-40" />;
  if (isError) return <DrilldownError error={error} />;
  if (data.players.length === 0) return <EmptyNotice label="active players" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.players.map((p) => (
          <TableRow key={p.playerId}>
            <TableCell>{p.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NoShowsTable({
  clubId,
  from,
  to,
}: {
  clubId: string;
  from: DateLabel;
  to: DateLabel;
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["noShows", "drilldown", clubId, from, to],
    queryFn: () => fetchNoShowsDrilldown(clubId, from, to),
  });

  if (isPending) return <Skeleton className="mx-4 h-40" />;
  if (isError) return <DrilldownError error={error} />;
  if (data.noShows.length === 0) return <EmptyNotice label="no-shows" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Started</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.noShows.map((n) => (
          <TableRow key={n.bookingId}>
            <TableCell>{n.playerName}</TableCell>
            <TableCell>{n.sessionTitle}</TableCell>
            <TableCell>{formatStartsAt(n.startsAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DrilldownSheet({
  metric,
  clubId,
  from,
  to,
  open,
  onOpenChange,
}: {
  metric: MetricName;
  clubId: string;
  from: DateLabel;
  to: DateLabel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{METRIC_LABELS[metric]}</SheetTitle>
          <SheetDescription>
            {from} to {to}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {open && metric === "sessionsHeld" && (
            <SessionsTable clubId={clubId} from={from} to={to} />
          )}
          {open && metric === "activePlayers" && (
            <PlayersTable clubId={clubId} from={from} to={to} />
          )}
          {open && metric === "noShows" && (
            <NoShowsTable clubId={clubId} from={from} to={to} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
