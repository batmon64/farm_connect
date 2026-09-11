import type { Metadata } from "next";
import { Wrench, Phone, MapPin, Calendar, IndianRupee } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { getJobCoordinates, getMyProviderProfile, listMyConfirmedWork } from "@/features/provider/queries";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatBudget, formatDateTime } from "@/features/marketplace/format";

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

  const assignments = await listMyConfirmedWork(supabase, providerProfile.id);
  const active = assignments.filter((a) => a.status === "assigned" || a.status === "confirmed") as Array<{
    id: string;
    job_id: string;
    status: string;
    farm_jobs: {
      id: string;
      created_by: string;
      title: string;
      status: string;
      scheduled_start: string | null;
      scheduled_end: string | null;
      budget_min: number | null;
      budget_max: number | null;
      budget_type: string | null;
    } | null;
  }>;

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

      {withDetails.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No confirmed jobs yet."
          description="Once a farmer accepts your offer, the job details appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {withDetails.map(({ assignment, job, point, farmerProfile }) => (
            <Card key={assignment.id}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{job?.title ?? "Job"}</h3>
                  {job ? <JobStatusBadge status={job.status as never} /> : null}
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
                  <a
                    href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
                  >
                    <MapPin className="size-4" aria-hidden />
                    View exact location
                  </a>
                ) : null}
                {farmerProfile?.phone ? (
                  <a
                    href={`tel:${farmerProfile.phone}`}
                    className="text-primary inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
                  >
                    <Phone className="size-4" aria-hidden />
                    {farmerProfile.phone}
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
