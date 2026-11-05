import type { NextRequest } from "next/server";
import { getActivePlayersDrilldown } from "@/lib/metrics";
import { ApiError, withErrorHandling } from "@/lib/api/errors";
import { parseRangeQuery } from "@/lib/api/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  return withErrorHandling(async () => {
    const { clubId } = await params;
    const { from, to } = parseRangeQuery(request.nextUrl.searchParams);

    const players = getActivePlayersDrilldown(clubId, from, to);
    if (!players) {
      throw new ApiError(404, "club_not_found", `No club with id "${clubId}"`);
    }
    return Response.json({ players });
  });
}
