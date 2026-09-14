import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Phone, MapPin, Calendar, IndianRupee, Search, Clock, UserCheck, PlayCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  getJobCoordinates,
  getMyProviderProfile,
  listMyConfirmedWork,
  discoverJobs,
} from "@/features/provider/queries";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { MetricCard } from "@/features/marketplace/components/metric-card";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { Button } from "@/components/ui/button";
import { formatBudget, formatDateTime } from "@/features/marketplace/format";
import type { FarmJob } from "@/types/marketplace";

export const metadata: Metadata = { title: "Work — FarmConnect" };

export default async function ProviderWorkPage() {
  const supabase = await createClient();
  const { user, profile } = await getCurrentProfile(supabase);
  if (!user) return null;

  const providerProfile = await getMyProviderProfile(supabase, user.id);
  if (!providerProfile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-xl font-semibold">Work</h1>
        <EmptyState
          icon={Wrench}
          title="Set up your provider profile first."
          description="Once you're set up and a farmer accepts your offer, confirmed jobs appear here."
        />
      </div>
    );
  }

  const [assignments, availableJobs] = await Promise.all([
    listMyConfirmedWork(supabase, providerProfile.id),
    discoverJobs(supabase),
  ]);

  type WorkAssignmentJob = Pick<
    FarmJob,
    "id" | "created_by" | "title" | "status" | "scheduled_start" | "scheduled_end" | "budget_min" | "budget_max" | "budget_type"
  >;
  const typedAssignments = assignments as Array<{
    id: string;
    job_id: string;
    farm_jobs: WorkAssignmentJob | null;
  }>;

  const activeWork = typedAssignments.filter((a) => a.farm_jobs?.status === "in_progress").length;
  const upcoming = typedAssignments.filter((a) => a.farm_jobs?.status === "confirmed").length;
  const completedWork = typedAssignments.filter((a) => a.farm_jobs?.status === "completed").length;

  // The list below shows what still needs the provider's attention —
  // confirmed (not yet started) and in_progress jobs. Completed/cancelled
  // work is reflected in the stat above, not repeated as cards here.
  const active = typedAssignments.filter(
    (a) => a.farm_jobs?.status === "confirmed" || a.farm_jobs?.status === "in_progress"
  );

  const farmerIds = Array.from(
    new Set(active.map((a) => a.farm_jobs?.created_by).filter((id): id is string => Boolean(id)))
  );
  const { data: farmerProfiles } = farmerIds.length
    ? await supabase.from("profiles").select("id, display_name, phone").in("id", farmerIds)
    : { data: [] };
  const farmerProfileById = new Map((farmerProfiles ?? []).map((p) => [p.id, p]));

  const withDetails = await Promise.all(
    active.map(async (a) => {
      const point = await getJobCoordinates(supabase, a.job_id);
      const farmerProfile = farmerProfileById.get(a.farm_jobs?.created_by ?? "") ?? null;
      return { assignment: a, job: a.farm_jobs, point, farmerProfile };
    })
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="border-border bg-fc-surface-2 relative overflow-hidden rounded-2xl border p-6 md:p-8">
        <p className="text-muted-foreground mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase">
          <span className="bg-primary inline-block size-[5px] rounded-full" />
          {providerProfile.business_name || profile?.location || "Your account"} · Provider
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm sm:text-base">
          {availableJobs.length > 0
            ? `${availableJobs.length} job${availableJobs.length === 1 ? "" : "s"} open near you, and ${upcoming + activeWork} upcoming or in progress.`
            : "No open jobs match your services right now — check back soon."}
        </p>
        <Button asChild className="mt-5 h-11">
          <Link href="/app/provider/jobs">
            <Search className="size-4" aria-hidden />
            Find Work
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Available Jobs" value={availableJobs.length} icon={Search} tone="default" />
        <MetricCard label="Upcoming" value={upcoming} icon={Clock} tone="warn" />
        <MetricCard label="Active Work" value={activeWork} icon={PlayCircle} tone="progress" />
        <MetricCard label="Completed" value={completedWork} icon={CheckCircle2} tone="ok" />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading font-semibold">Your confirmed work</h2>

        {withDetails.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No confirmed jobs yet."
            description="Once a farmer accepts your offer, the job details appear here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {withDetails.map(({ assignment, job, point, farmerProfile }) => (
              <Link
                key={assignment.id}
                href={`/app/provider/jobs/${assignment.job_id}`}
                className="border-border bg-card hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading font-semibold">{job?.title ?? "Job"}</h3>
                  {job ? <JobStatusBadge status={job.status} /> : null}
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4" aria-hidden />
                    {formatDateTime(job?.scheduled_start ?? null)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IndianRupee className="size-4" aria-hidden />
                    {formatBudget(job?.budget_min ?? null, job?.budget_max ?? null, job?.budget_type ?? null)}
                  </span>
                </div>
                {point ? (
                  <span className="text-primary inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                    <MapPin className="size-4" aria-hidden />
                    View exact location
                  </span>
                ) : null}
                {farmerProfile?.phone ? (
                  <span className="text-primary inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                    <Phone className="size-4" aria-hidden />
                    {farmerProfile.phone}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
