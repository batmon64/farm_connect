import type { Metadata } from "next";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { getMyProviderProfile, discoverJobs } from "@/features/provider/queries";
import { listServiceCatalogue } from "@/features/jobs/queries";
import { DiscoveredJobCard } from "@/features/provider/components/discovered-job-card";
import { JobFilters } from "@/features/provider/components/job-filters";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Button } from "@/components/ui/button";
import { parseJobFilters, resolveDiscoverJobsParams, hasActiveFilters } from "@/features/provider/job-filters";

export const metadata: Metadata = { title: "Find Jobs — FarmConnect" };

export default async function ProviderJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const providerProfile = await getMyProviderProfile(supabase, user.id);
  if (!providerProfile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Find Jobs</h1>
        <EmptyState
          icon={Search}
          title="Set up your provider profile first."
          description="We need a few details about your business before you can browse jobs."
          action={
            <Button asChild>
              <Link href="/app/provider/profile">Set up profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const rawParams = await searchParams;
  const filterValues = parseJobFilters(rawParams);
  const resolved = resolveDiscoverJobsParams(filterValues);
  const filtersActive = hasActiveFilters(filterValues);

  const [jobs, { services }] = await Promise.all([
    discoverJobs(supabase, undefined, {
      serviceId: filterValues.service !== "any" ? filterValues.service : null,
      maxDistanceKm: resolved.maxDistanceKm,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
      budgetMin: resolved.budgetMin,
      budgetMax: resolved.budgetMax,
      sort: resolved.sort,
    }),
    listServiceCatalogue(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Find Jobs</h1>
        <p className="text-muted-foreground text-sm">
          Jobs matching your services appear first, then by distance and timing.
        </p>
      </div>

      <JobFilters filters={filterValues} services={services} />

      {jobs.length === 0 ? (
        filtersActive ? (
          <EmptyState
            icon={SearchX}
            title="No jobs match these filters."
            description="Try widening your distance or clearing a filter to see more jobs."
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No matching jobs nearby right now."
            description="Check back soon, or add more services to see a wider range of jobs."
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <DiscoveredJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
