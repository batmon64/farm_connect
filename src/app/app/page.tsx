import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sprout, Clock, UserCheck, PlayCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { listMyJobs } from "@/features/jobs/queries";
import { JobCard } from "@/features/jobs/components/job-card";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { MetricCard } from "@/features/marketplace/components/metric-card";
import { Button } from "@/components/ui/button";

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
  const recent = jobs.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="border-border bg-fc-surface-2 relative overflow-hidden rounded-2xl border p-6 md:p-8">
        <p className="text-muted-foreground mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase">
          <span className="bg-primary inline-block size-[5px] rounded-full" />
          {profile.location || "Your account"} · Farmer
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back{profile.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm sm:text-base">
          {jobs.length === 0
            ? "Post your first job and providers nearby can start sending offers."
            : `You have ${confirmed + inProgress} active job${confirmed + inProgress === 1 ? "" : "s"}, and ${awaitingOffers} awaiting offers.`}
        </p>
        <Button asChild className="mt-5 h-11">
          <Link href="/app/jobs/new">
            <Plus className="size-4" aria-hidden />
            Post a Job
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Awaiting Offers" value={awaitingOffers} icon={Clock} tone="warn" />
        <MetricCard label="Confirmed" value={confirmed} icon={UserCheck} tone="info" />
        <MetricCard label="In Progress" value={inProgress} icon={PlayCircle} tone="progress" />
        <MetricCard label="Completed" value={completed} icon={CheckCircle2} tone="ok" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold">Recent jobs</h2>
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
