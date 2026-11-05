"use client";

// The host's chosen date range (FR2) lives in the URL, not component state
// (docs/SYSTEM_DESIGN.md §2.5) - this component only reads it from props and writes it back
// via router.push. The in-progress selection while the popover is open is local state
// (§2.5's "ephemeral, doesn't need to survive navigation" category), separate from the
// committed range.

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateLabel } from "@/lib/metrics/time";

function labelToDate(label: DateLabel): Date {
  const [y, m, d] = label.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToLabel(date: Date): DateLabel {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateRangePicker({
  from,
  to,
}: {
  from: DateLabel;
  to: DateLabel;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(() => ({
    from: labelToDate(from),
    to: labelToDate(to),
  }));

  function handleSelect(next: DateRange | undefined) {
    setDraft(next);
    if (!next?.from || !next?.to) return;

    const params = new URLSearchParams(searchParams);
    params.set("from", dateToLabel(next.from));
    params.set("to", dateToLabel(next.to));
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarIcon />
        {from} to {to}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={draft?.from}
          selected={draft}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
