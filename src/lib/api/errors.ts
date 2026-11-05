// The fixed error response shape every route handler returns (docs/SYSTEM_DESIGN.md §2.7, §4).
// Route handlers throw ApiError for anything expected (bad input, missing club); anything else
// is an unhandled bug, so it's logged and turned into a generic 500 rather than leaking a stack
// trace to the client.

export type ApiErrorCode =
  "invalid_date_range" | "invalid_metric" | "club_not_found" | "internal_error";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function errorResponse(status: number, code: ApiErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function withErrorHandling(
  handler: () => Response | Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.status, err.code, err.message);
    }
    console.error(err);
    return errorResponse(500, "internal_error", "Something went wrong");
  }
}
