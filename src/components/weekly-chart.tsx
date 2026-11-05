"use client";

// Container + presentation combined (the chart has no reuse elsewhere, unlike KpiCard).
// Fetches the same /api/clubs/:id/weekly endpoint the brief asks for one of the three
// numbers to be broken down by week (FR3).

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchWeekly, ApiClientError } from "@/lib/api-client";
import type { DateLabel } from "@/lib/metrics/time";
import type { MetricName } from "@/lib/metrics/definitions";
import { Skeleton } from "@/components/ui/skeleton";
import { METRIC_LABELS } from "@/lib/metric-labels";

// Display-only formatting of a "YYYY-MM-DD" label - parsed as a naive local date, same as
// date-range-picker.tsx, since there's no timezone conversion needed to just show the label.
function formatWeekLabel(label: DateLabel): string {
  const [y, m, d] = label.split("-").map(Number);
  return format(new Date(y, m - 1, d), "MMM d");
}

export function WeeklyChart({
  clubId,
  metric,
  from,
  to,
}: {
  clubId: string;
  metric: MetricName;
  from: DateLabel;
  to: DateLabel;
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["weekly", clubId, metric, from, to],
    queryFn: () => fetchWeekly(clubId, metric, from, to),
  });

  if (isPending) {
    return <Skeleton className="h-64" />;
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load the weekly chart
        {error instanceof ApiClientError ? `: ${error.message}` : "."}
      </p>
    );
  }

  if (data.points.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No full weeks in this range yet.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.points}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="weekStart"
            tickFormatter={formatWeekLabel}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            fontSize={12}
          />
          <Tooltip
            formatter={(value) => [`${value}`, METRIC_LABELS[metric]]}
            labelFormatter={(label) =>
              `Week of ${formatWeekLabel(label as DateLabel)}`
            }
          />
          <Bar dataKey="value" fill="var(--primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
