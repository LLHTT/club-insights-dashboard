import type { NextRequest } from "next/server";
import { getWeeklySeries } from "@/lib/metrics";
import { ApiError, withErrorHandling } from "@/lib/api/errors";
import { parseRangeQuery, parseMetricQuery } from "@/lib/api/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  return withErrorHandling(async () => {
    const { clubId } = await params;
    const metric = parseMetricQuery(request.nextUrl.searchParams);
    const { from, to } = parseRangeQuery(request.nextUrl.searchParams);

    const result = getWeeklySeries(clubId, metric, from, to);
    if (!result) {
      throw new ApiError(404, "club_not_found", `No club with id "${clubId}"`);
    }
    return Response.json(result);
  });
}
