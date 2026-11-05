import { defaultRangeLabels, NOW, type DateLabel } from "@/lib/metrics/time";
import { ClubSummary } from "@/components/club-summary";
import { DateRangePicker } from "@/components/date-range-picker";

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

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Overview</h1>
        <DateRangePicker key={`${from}_${to}`} from={from} to={to} />
      </div>
      <ClubSummary clubId={clubId} from={from} to={to} />
      <p className="text-muted-foreground text-sm">
        Weekly chart and drill-downs coming soon.
      </p>
    </main>
  );
}
