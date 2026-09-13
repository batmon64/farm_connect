import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sprout } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { listMyJobs } from "@/features/jobs/queries";
import { JobCard } from "@/features/jobs/components/job-card";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { MetricCard } from "@/features/marketplace/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Home — FarmConnect" };

export default async function FarmerHomePage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentProfile(supabase);
  if (!user || !profile) return null;

  if (!profile.is_farmer) {
    if (profile.is_provider) redirect("/app/provider");
    return null;
  }

  const jobs = await listMyJobs(supabase, user.id);
  const awaitingOffers = jobs.filter((j) => ["posted", "matching", "offers_received"].includes(j.status)).length;
  const confirmed = jobs.filter((j) => j.status === "confirmed").length;
  const inProgress = jobs.filter((j) => j.status === "in_progress").length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const activeJobs = confirmed + inProgress;
  const recent = jobs.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Welcome back{profile.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm">Here&apos;s what&apos;s happening with your jobs.</p>
        </div>
      </div>

      <Button asChild className="h-12 w-full text-base md:w-auto">
        <Link href="/app/jobs/new">
          <Plus className="size-4" aria-hidden />
          Post a Job
        </Link>
      </Button>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between px-5 py-4">
          <span className="text-sm font-medium">Active Jobs</span>
          <span className="text-2xl font-semibold">{activeJobs}</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Awaiting Offers" value={awaitingOffers} />
        <MetricCard label="Confirmed" value={confirmed} />
        <MetricCard label="In Progress" value={inProgress} />
        <MetricCard label="Completed" value={completed} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent jobs</h2>
          {jobs.length > 0 ? (
            <Link href="/app/jobs" className="text-primary text-sm underline underline-offset-4">
              View all
            </Link>
          ) : null}
        </div>

        {recent.length === 0 ? (
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
            {recent.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
