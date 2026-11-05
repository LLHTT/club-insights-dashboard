import { defaultRangeLabels, NOW, type DateLabel } from "@/lib/metrics/time";
import type { MetricName } from "@/lib/metrics/definitions";
import { DateRangePicker } from "@/components/date-range-picker";
import { ClubDashboard } from "@/components/club-dashboard";
import { METRIC_NAMES } from "@/lib/metric-labels";

function parseDateLabel(
  value: string | string[] | undefined,
): DateLabel | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseMetric(value: string | string[] | undefined): MetricName {
  if (typeof value === "string" && (METRIC_NAMES as string[]).includes(value)) {
    return value as MetricName;
  }
  return "activePlayers";
}

export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { clubId } = await params;
  const query = await searchParams;

  const defaults = defaultRangeLabels(NOW);
  const from = parseDateLabel(query.from) ?? defaults.from;
  const to = parseDateLabel(query.to) ?? defaults.to;
  const metric = parseMetric(query.metric);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Overview</h1>
        <DateRangePicker key={`${from}_${to}`} from={from} to={to} />
      </div>
      <ClubDashboard clubId={clubId} from={from} to={to} metric={metric} />
    </main>
  );
}
