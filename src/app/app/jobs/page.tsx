import type { Metadata } from "next";
import Link from "next/link";
import { Sprout, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { listMyJobs } from "@/features/jobs/queries";
import { JobCard } from "@/features/jobs/components/job-card";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Jobs — FarmConnect" };

export default async function MyJobsPage() {
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const jobs = await listMyJobs(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">My Jobs</h1>
        <Button asChild size="sm">
          <Link href="/app/jobs/new">
            <Plus className="size-4" aria-hidden />
            New job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="You haven't posted a job yet."
          description="Post your first farm job and providers nearby will be able to respond with offers."
          action={
            <Button asChild>
              <Link href="/app/jobs/new">Post your first job</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
