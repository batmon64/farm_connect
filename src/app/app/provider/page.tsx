import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Phone, MapPin, Calendar, IndianRupee, Search } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { formatBudget, formatDateTime } from "@/features/marketplace/format";
import type { FarmJob } from "@/types/marketplace";

export const metadata: Metadata = { title: "Work — FarmConnect" };

export default async function ProviderWorkPage() {
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const providerProfile = await getMyProviderProfile(supabase, user.id);
  if (!providerProfile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Work</h1>
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

  const withDetails = await Promise.all(
    active.map(async (a) => {
      const [point, { data: farmerProfile }] = await Promise.all([
        getJobCoordinates(supabase, a.job_id),
        supabase
          .from("profiles")
          .select("display_name, phone")
          .eq("id", a.farm_jobs?.created_by ?? "")
          .maybeSingle(),
      ]);
      return { assignment: a, job: a.farm_jobs, point, farmerProfile };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Work</h1>

      <Button asChild className="h-12 w-full text-base md:w-auto">
        <Link href="/app/provider/jobs">
          <Search className="size-4" aria-hidden />
          Find Work
        </Link>
      </Button>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Available Jobs" value={availableJobs.length} />
        <MetricCard label="Active Work" value={activeWork} />
        <MetricCard label="Upcoming" value={upcoming} />
        <MetricCard label="Completed" value={completedWork} />
      </div>

      {withDetails.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No confirmed jobs yet."
          description="Once a farmer accepts your offer, the job details appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {withDetails.map(({ assignment, job, point, farmerProfile }) => (
            <Link key={assignment.id} href={`/app/provider/jobs/${assignment.job_id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{job?.title ?? "Job"}</h3>
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
