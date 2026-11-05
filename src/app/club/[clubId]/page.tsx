import { defaultRangeLabels, NOW, type DateLabel } from "@/lib/metrics/time";
import type { MetricName } from "@/lib/metrics/definitions";

const METRIC_NAMES: MetricName[] = ["activePlayers", "sessionsHeld", "noShows"];

function parseMetric(value: string | string[] | undefined): MetricName {
  if (typeof value === "string" && (METRIC_NAMES as string[]).includes(value)) {
    return value as MetricName;
  }
  return "activePlayers";
}

function parseDateLabel(
  value: string | string[] | undefined,
): DateLabel | undefined {
  return typeof value === "string" ? value : undefined;
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
    <main className="flex flex-1 flex-col gap-2 p-6">
      <p className="text-sm">
        Showing <span className="font-medium">{clubId}</span>, {from} to {to},
        metric: {metric}
      </p>
      <p className="text-muted-foreground text-sm">
        Dashboard content coming soon.
      </p>
    </main>
  );
}
