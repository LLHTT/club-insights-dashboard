"use client";

// Catches a render-time exception anywhere in this route (not an API error - those are
// already handled per-component via TanStack Query's error state) and shows a plain
// fallback instead of a raw stack trace (docs/SYSTEM_DESIGN.md §1.2).

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ClubError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Something went wrong.</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        This page hit an unexpected error. You can try again, or switch to the
        other club from the header.
      </p>
      <Button variant="outline" size="sm" onClick={retry}>
        Try again
      </Button>
    </main>
  );
}
