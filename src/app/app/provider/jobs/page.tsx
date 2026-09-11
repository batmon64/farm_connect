import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { getMyProviderProfile } from "@/features/provider/queries";
import { discoverJobs } from "@/features/provider/queries";
import { DiscoveredJobCard } from "@/features/provider/components/discovered-job-card";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Find Jobs — FarmConnect" };

export default async function ProviderJobsPage() {
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

  const jobs = await discoverJobs(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Find Jobs</h1>
        <p className="text-muted-foreground text-sm">
          Jobs matching your services appear first, then by distance and timing.
        </p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No open jobs right now."
          description="Check back soon, or add more services to see a wider range of jobs."
        />
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
