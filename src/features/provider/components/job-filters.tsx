"use client";

import { useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DATE_OPTIONS,
  DISTANCE_OPTIONS,
  BUDGET_OPTIONS,
  SORT_OPTIONS,
  hasActiveFilters,
  type JobFilterValues,
} from "../job-filters";
import type { Service } from "@/types/marketplace";

export function JobFilters({
  filters,
  services,
}: {
  filters: JobFilterValues;
  services: Service[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "any" || value === "recommended") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router]);

  const active = hasActiveFilters(filters);

  return (
    <div className={`flex flex-col gap-2 ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <SlidersHorizontal className="text-muted-foreground size-4" aria-hidden />
        Filters
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground ml-auto h-7 px-2 text-xs"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Select value={filters.service} onValueChange={(v) => setParam("service", v)}>
          <SelectTrigger className="h-9 shrink-0 rounded-full" aria-label="Filter by service">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">All services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.date} onValueChange={(v) => setParam("date", v)}>
          <SelectTrigger className="h-9 shrink-0 rounded-full" aria-label="Filter by date">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.distance} onValueChange={(v) => setParam("distance", v)}>
          <SelectTrigger className="h-9 shrink-0 rounded-full" aria-label="Filter by distance">
            <SelectValue placeholder="Distance" />
          </SelectTrigger>
          <SelectContent>
            {DISTANCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.budget} onValueChange={(v) => setParam("budget", v)}>
          <SelectTrigger className="h-9 shrink-0 rounded-full" aria-label="Filter by budget">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="h-9 shrink-0 rounded-full" aria-label="Sort jobs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
