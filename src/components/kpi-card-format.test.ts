import { describe, it, expect } from "vitest";
import { formatTrend, trendSentiment } from "./kpi-card-format";
import type { MetricValue } from "@/lib/metrics/definitions";

function metric(overrides: Partial<MetricValue>): MetricValue {
  return {
    value: 10,
    previousValue: 10,
    delta: 0,
    deltaPct: 0,
    definition: "test",
    ...overrides,
  };
}

describe("formatTrend", () => {
  it("reports no data when both periods are zero", () => {
    const m = metric({ value: 0, previousValue: 0, delta: 0, deltaPct: null });
    expect(formatTrend(m)).toBe("No data in either period");
  });

  it("reports the raw delta when there's no previous period to compare", () => {
    const m = metric({ value: 5, previousValue: 0, delta: 5, deltaPct: null });
    expect(formatTrend(m)).toBe("+5 vs previous period (which had none)");
  });

  it("reports a signed percentage change", () => {
    const m = metric({
      value: 89,
      previousValue: 88,
      delta: 1,
      deltaPct: 1 / 88,
    });
    expect(formatTrend(m)).toBe("+1% vs previous period");
  });
});

describe("trendSentiment", () => {
  it("treats a rise as good when goodDirection is up (active players, sessions held)", () => {
    expect(trendSentiment(metric({ delta: 1 }), "up")).toBe("good");
    expect(trendSentiment(metric({ delta: -1 }), "up")).toBe("bad");
  });

  it("treats a rise as bad when goodDirection is down (no-shows)", () => {
    expect(trendSentiment(metric({ delta: 1 }), "down")).toBe("bad");
    expect(trendSentiment(metric({ delta: -1 }), "down")).toBe("good");
  });

  it("is neutral with no change, regardless of direction", () => {
    expect(trendSentiment(metric({ delta: 0 }), "up")).toBe("neutral");
    expect(trendSentiment(metric({ delta: 0 }), "down")).toBe("neutral");
  });
});
