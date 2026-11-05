// Request validation at the API boundary (docs/SYSTEM_DESIGN.md §2.7) - malformed input is
// rejected here with a 400, before it reaches the service layer.

import { z } from "zod";
import { ApiError } from "./errors";
import type { DateLabel } from "@/lib/metrics/time";
import type { MetricName } from "@/lib/metrics/definitions";

const dateLabelSchema = z
  .string({ error: "must be a date in YYYY-MM-DD format" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date in YYYY-MM-DD format");

const rangeQuerySchema = z
  .object({
    from: dateLabelSchema,
    to: dateLabelSchema,
  })
  .refine((v) => v.from <= v.to, {
    message: "`from` must not be after `to`",
  });

const metricSchema = z.enum(["activePlayers", "sessionsHeld", "noShows"], {
  error: "must be one of activePlayers, sessionsHeld, noShows",
});

/** Parses and validates `from`/`to`, throwing the fixed ApiError shape on failure. */
export function parseRangeQuery(searchParams: URLSearchParams): {
  from: DateLabel;
  to: DateLabel;
} {
  const parsed = rangeQuerySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });
  if (!parsed.success) {
    throw new ApiError(
      400,
      "invalid_date_range",
      parsed.error.issues[0]?.message ?? "Invalid date range",
    );
  }
  return parsed.data;
}

/** Parses and validates `metric`, throwing the fixed ApiError shape on failure. */
export function parseMetricQuery(searchParams: URLSearchParams): MetricName {
  const parsed = metricSchema.safeParse(searchParams.get("metric"));
  if (!parsed.success) {
    throw new ApiError(
      400,
      "invalid_metric",
      parsed.error.issues[0]?.message ?? "Invalid metric",
    );
  }
  return parsed.data;
}
