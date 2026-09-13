import type { JobSort } from "@/types/marketplace";

export const DISTANCE_OPTIONS = [
  { value: "any", label: "Any distance", km: null },
  { value: "5", label: "Within 5 km", km: 5 },
  { value: "10", label: "Within 10 km", km: 10 },
  { value: "25", label: "Within 25 km", km: 25 },
  { value: "50", label: "Within 50 km", km: 50 },
] as const;

export const DATE_OPTIONS = [
  { value: "any", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "Next 7 days" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "any", label: "Any budget", min: null, max: null },
  { value: "under-2000", label: "Under ₹2,000", min: null, max: 2000 },
  { value: "2000-5000", label: "₹2,000–₹5,000", min: 2000, max: 5000 },
  { value: "5000-10000", label: "₹5,000–₹10,000", min: 5000, max: 10000 },
  { value: "10000-plus", label: "₹10,000+", min: 10000, max: null },
] as const;

export const SORT_OPTIONS: { value: JobSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "nearest", label: "Nearest" },
  { value: "newest", label: "Newest" },
  { value: "budget", label: "Highest budget" },
  { value: "earliest", label: "Earliest job" },
];

export type JobFilterValues = {
  service: string;
  date: string;
  distance: string;
  budget: string;
  sort: JobSort;
};

export const DEFAULT_FILTERS: JobFilterValues = {
  service: "any",
  date: "any",
  distance: "any",
  budget: "any",
  sort: "recommended",
};

export function parseJobFilters(
  searchParams: Record<string, string | string[] | undefined>
): JobFilterValues {
  const get = (key: string) => {
    const v = searchParams[key];
    return typeof v === "string" ? v : undefined;
  };
  const sort = get("sort");
  return {
    service: get("service") ?? DEFAULT_FILTERS.service,
    date: get("date") ?? DEFAULT_FILTERS.date,
    distance: get("distance") ?? DEFAULT_FILTERS.distance,
    budget: get("budget") ?? DEFAULT_FILTERS.budget,
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as JobSort) : DEFAULT_FILTERS.sort,
  };
}

/** Converts UI filter values into the plain min/max/range values
 * discover_jobs() expects. "This week" is a rolling 7-day window from
 * today, not a calendar week — simpler and more useful for farm work
 * than a Mon–Sun boundary. */
export function resolveDiscoverJobsParams(filters: JobFilterValues) {
  const distanceOption = DISTANCE_OPTIONS.find((o) => o.value === filters.distance);
  const budgetOption = BUDGET_OPTIONS.find((o) => o.value === filters.budget);

  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filters.date === "today") {
    dateFrom = startOfToday.toISOString();
    dateTo = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
  } else if (filters.date === "tomorrow") {
    const tomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    dateFrom = tomorrow.toISOString();
    dateTo = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
  } else if (filters.date === "week") {
    dateFrom = startOfToday.toISOString();
    dateTo = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1).toISOString();
  }

  return {
    maxDistanceKm: distanceOption?.km ?? null,
    dateFrom,
    dateTo,
    budgetMin: budgetOption?.min ?? null,
    budgetMax: budgetOption?.max ?? null,
    sort: filters.sort,
  };
}

export function hasActiveFilters(filters: JobFilterValues): boolean {
  return (
    filters.service !== DEFAULT_FILTERS.service ||
    filters.date !== DEFAULT_FILTERS.date ||
    filters.distance !== DEFAULT_FILTERS.distance ||
    filters.budget !== DEFAULT_FILTERS.budget
  );
}
