"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchClubs } from "@/lib/api-client";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ClubSwitcher({ activeClubId }: { activeClubId: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["clubs"],
    queryFn: fetchClubs,
  });

  if (isPending) {
    return (
      <div className="flex gap-1.5">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <span className="text-destructive text-sm">
        Couldn&apos;t load clubs.
      </span>
    );
  }

  return (
    <nav className="flex gap-1.5">
      {data.map((club) => (
        <Link
          key={club.clubId}
          href={`/club/${club.clubId}`}
          className={cn(
            buttonVariants({
              variant: club.clubId === activeClubId ? "default" : "ghost",
              size: "sm",
            }),
          )}
        >
          {club.name}
        </Link>
      ))}
    </nav>
  );
}
