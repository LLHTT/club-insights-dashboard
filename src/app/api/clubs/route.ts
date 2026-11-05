import { listClubs } from "@/lib/metrics";
import { withErrorHandling } from "@/lib/api/errors";

export async function GET() {
  return withErrorHandling(() => Response.json(listClubs()));
}
