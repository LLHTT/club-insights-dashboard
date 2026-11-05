"use client";

// Which metric drives the weekly chart (FR3) lives in the URL, same as the date range
// (docs/SYSTEM_DESIGN.md §2.5) - this is a control, not a source of truth.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MetricName } from "@/lib/metrics/definitions";
import { METRIC_LABELS, METRIC_NAMES } from "@/lib/metric-labels";

export function MetricToggle({ metric }: { metric: MetricName }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: unknown) {
    const params = new URLSearchParams(searchParams);
    params.set("metric", value as MetricName);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={metric} onValueChange={handleChange}>
      <TabsList>
        {METRIC_NAMES.map((name) => (
          <TabsTrigger key={name} value={name}>
            {METRIC_LABELS[name]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
