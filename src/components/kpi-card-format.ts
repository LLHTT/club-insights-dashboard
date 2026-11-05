// Pure formatting/sentiment logic pulled out of kpi-card.tsx so it's directly unit-testable,
// the same pattern as src/lib/metrics - a rising no-shows count must read as bad news, not
// good, which is exactly the kind of thing worth a test rather than eyeballing.

import type { MetricValue } from "@/lib/metrics/definitions";

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatTrend(metric: MetricValue): string {
  if (metric.value === 0 && metric.previousValue === 0) {
    return "No data in either period";
  }
  if (metric.deltaPct === null) {
    return `${formatSigned(metric.delta)} vs previous period (which had none)`;
  }
  return `${formatSigned(Math.round(metric.deltaPct * 100))}% vs previous period`;
}

export type TrendSentiment = "good" | "bad" | "neutral";

/** Whether a rise in this metric is good news or bad news - no-shows going up is bad,
 *  unlike active players or sessions held, so the direction isn't always "up = good". */
export function trendSentiment(
  metric: MetricValue,
  goodDirection: "up" | "down",
): TrendSentiment {
  if (metric.delta === 0) return "neutral";
  const rose = metric.delta > 0;
  const isGood = goodDirection === "up" ? rose : !rose;
  return isGood ? "good" : "bad";
}
