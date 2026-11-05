// Presentational only (docs/SYSTEM_DESIGN.md §2.4): props in, JSX out, no fetching. The
// definition is rendered directly on the card, not behind a tooltip - FR5 asks for it to be
// shown next to the number, not discovered by hovering.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MetricValue } from "@/lib/metrics/definitions";
import { formatTrend, trendSentiment } from "./kpi-card-format";

export function KpiCard({
  label,
  metric,
  footnote,
  goodDirection = "up",
  onViewDetails,
}: {
  label: string;
  metric: MetricValue;
  footnote?: string;
  /** Whether a rising value is good news or bad news - no-shows going up is bad, unlike
   *  active players or sessions held. Controls the trend color, not the sign shown. */
  goodDirection?: "up" | "down";
  /** FR4: click the number to see what's behind it. Omit to render a plain, non-interactive
   *  number (e.g. while the drill-down list can't be fetched yet). */
  onViewDetails?: () => void;
}) {
  const sentiment = trendSentiment(metric, goodDirection);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          {onViewDetails ? (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-2xl font-semibold underline-offset-4 hover:underline"
            >
              {metric.value}
            </button>
          ) : (
            <span className="text-2xl font-semibold">{metric.value}</span>
          )}
          <span
            className={cn(
              "text-xs",
              sentiment === "good" && "text-emerald-600",
              sentiment === "bad" && "text-destructive",
              sentiment === "neutral" && "text-muted-foreground",
            )}
          >
            {formatTrend(metric)}
          </span>
        </div>
        {footnote && (
          <p className="text-muted-foreground text-xs">{footnote}</p>
        )}
        <p className="text-muted-foreground text-xs">{metric.definition}</p>
      </CardContent>
    </Card>
  );
}
