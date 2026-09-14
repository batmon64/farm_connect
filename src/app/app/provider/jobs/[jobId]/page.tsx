import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, IndianRupee, MapPin, Phone, User, Lock, LockOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  getMyProviderProfile,
  discoverJobs,
  getMyAssignmentForJob,
  getJobCoordinates,
} from "@/features/provider/queries";
import { SubmitOfferForm } from "@/features/provider/components/submit-offer-form";
import { JobStatusLine } from "@/features/jobs/components/job-status-line";
import { JobTimeline } from "@/features/jobs/components/job-timeline";
import { JobLifecycleActions } from "@/features/jobs/components/job-lifecycle-actions";
import { JobHistory } from "@/features/jobs/components/job-history";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { getMyReviewForAssignment } from "@/features/reviews/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  formatBudget,
  formatDate,
  formatDateTime,
  formatDistance,
} from "@/features/marketplace/format";
import type { JobMachineRequirement, JobWorkerRequirement } from "@/types/marketplace";

export const metadata: Metadata = { title: "Job details — FarmConnect" };

export default async function ProviderJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return null;

  const providerProfile = await getMyProviderProfile(supabase, user.id);
  const jobs = await discoverJobs(supabase, jobId);
  const job = jobs[0];

  if (!job) {
    // Not in the open/discoverable set — either it never was, or it has
    // moved past confirmation. If this provider is the assigned one,
    // render the operational lifecycle view instead of 404ing.
    const assignment = await getMyAssignmentForJob(supabase, jobId);
    if (!assignment?.farm_jobs) notFound();
    return (
      <AssignedJobView
        job={assignment.farm_jobs}
        assignmentId={assignment.id}
        providerName={assignment.provider_profiles?.business_name ?? null}
      />
    );
  }

  const [{ data: services }, { data: machineReqs }, { data: workerReqs }] = await Promise.all([
    supabase.from("job_services").select("*, services(name, unit_type)").eq("job_id", jobId),
    supabase.from("job_machine_requirements").select("*").eq("job_id", jobId),
    supabase.from("job_worker_requirements").select("*").eq("job_id", jobId),
  ]);

  let existingOfferStatus: string | null = null;
  if (providerProfile) {
    const { data: existing } = await supabase
      .from("job_offers")
      .select("status")
      .eq("job_id", jobId)
      .eq("provider_id", providerProfile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingOfferStatus = existing?.status ?? null;
  }

  const distance = formatDistance(job.distance_km);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold sm:text-2xl">{job.title}</h1>
        <p className="text-muted-foreground text-sm">Posted {formatDate(job.created_at)}</p>
      </div>

      <div className="border-border bg-fc-surface-2 flex items-start gap-3 rounded-lg border p-4 text-sm">
        <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-muted-foreground">
          The farmer&apos;s exact location and phone number stay hidden until they accept your offer.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 text-sm">
          {job.description ? <p>{job.description}</p> : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden />
              {formatDateTime(job.scheduled_start)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="size-4" aria-hidden />
              {formatBudget(job.budget_min, job.budget_max, job.budget_type)}
            </span>
            {job.locality || distance ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {[job.locality, distance].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
            {(services ?? []).map(
              (s: { id: string; quantity: number | null; unit: string | null; services: { name: string; unit_type: string | null } | null }) => (
                <p key={s.id}>
                  <span className="font-medium">{s.services?.name ?? "Service"}</span>
                  {s.quantity ? ` — ${s.quantity} ${s.unit ?? s.services?.unit_type ?? ""}` : ""}
                </p>
              )
            )}
            {((workerReqs ?? []) as JobWorkerRequirement[]).map((w) => (
              <p key={w.id} className="text-muted-foreground">
                {w.worker_count} worker{w.worker_count > 1 ? "s" : ""}
                {w.skill_requirement ? ` — ${w.skill_requirement}` : ""}
              </p>
            ))}
            {((machineReqs ?? []) as JobMachineRequirement[]).map((m) => (
              <p key={m.id} className="text-muted-foreground">
                {m.quantity} × {m.machine_type}
                {m.operator_required ? " (with operator)" : ""}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {!providerProfile ? (
        <Alert>
          <AlertDescription>Set up your provider profile before making an offer.</AlertDescription>
        </Alert>
      ) : existingOfferStatus === "pending" ? (
        <Alert>
          <AlertDescription>
            You&apos;ve already made an offer on this job.{" "}
            <Badge variant="outline" className="ml-1">
              Pending
            </Badge>
          </AlertDescription>
        </Alert>
      ) : existingOfferStatus === "accepted" ? (
        <Alert>
          <AlertDescription>Your offer on this job was accepted.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-heading mb-4 font-semibold">Make an Offer</h2>
            <SubmitOfferForm jobId={jobId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** The operational view for a job the calling provider is assigned to
 * (confirmed/in_progress/completed/cancelled) — RLS already grants full
 * row access including farm_jobs.location and the farmer's phone once
 * assigned (0011), so this reads directly rather than going through
 * discover_jobs' privacy-scoped columns. */
async function AssignedJobView({
  job,
  assignmentId,
  providerName,
}: {
  job: import("@/types/marketplace").FarmJob;
  assignmentId: string;
  providerName: string | null;
}) {
  const supabase = await createClient();
  const [{ data: farmerProfile }, point] = await Promise.all([
    supabase.from("profiles").select("display_name, phone, location").eq("id", job.created_by).maybeSingle(),
    getJobCoordinates(supabase, job.id),
  ]);

  let existingReview = null;
  if (job.status === "completed") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      existingReview = await getMyReviewForAssignment(supabase, assignmentId, user.id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-xl font-semibold sm:text-2xl">{job.title}</h1>
        {farmerProfile?.location ? (
          <p className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            <MapPin className="size-3.5" aria-hidden />
            {farmerProfile.location}
          </p>
        ) : null}
        <JobStatusLine status={job.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 text-sm">
          {job.description ? <p>{job.description}</p> : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden />
              {formatDateTime(job.scheduled_start)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="size-4" aria-hidden />
              {formatBudget(job.budget_min, job.budget_max, job.budget_type)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <JobTimeline status={job.status} />
        </CardContent>
      </Card>

      <Card
        className={job.status === "cancelled" ? "border-destructive" : "border-fc-ok/40 bg-fc-ok/5"}
      >
        <CardContent className="flex flex-col gap-3 pt-5">
          {job.status !== "cancelled" ? (
            <p className="text-fc-ok flex items-center gap-1.5 text-xs font-medium">
              <LockOpen className="size-3.5" aria-hidden />
              Contact shared — you&apos;re confirmed for this job
            </p>
          ) : null}
          {providerName ? (
            <div>
              <p className="text-muted-foreground text-xs">Your business</p>
              <p className="flex items-center gap-2 text-sm font-medium">
                <User className="size-4" aria-hidden />
                {providerName}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-muted-foreground text-xs">Farmer</p>
            <p className="text-sm font-medium">{farmerProfile?.display_name || "Farmer"}</p>
          </div>
          {farmerProfile?.phone ? (
            <a
              href={`tel:${farmerProfile.phone}`}
              className="text-primary flex items-center gap-2 text-sm underline underline-offset-4"
            >
              <Phone className="size-4" aria-hidden />
              {farmerProfile.phone}
            </a>
          ) : null}
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

          {job.status === "confirmed" ? (
            <p className="text-muted-foreground text-sm">Ready when you are.</p>
          ) : job.status === "in_progress" && job.started_at ? (
            <p className="text-muted-foreground text-sm">Started {formatDateTime(job.started_at)}.</p>
          ) : job.status === "completed" && job.completed_at ? (
            <p className="text-sm font-medium">Completed {formatDateTime(job.completed_at)}.</p>
          ) : job.status === "cancelled" ? (
            <p className="text-destructive text-sm font-medium">
              Cancelled{job.cancelled_at ? ` ${formatDateTime(job.cancelled_at)}` : ""}
              {job.cancellation_reason ? ` — ${job.cancellation_reason}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <JobLifecycleActions jobId={job.id} status={job.status} viewerRole="provider" />

      {job.status === "completed" ? (
        <ReviewForm
          jobId={job.id}
          assignmentId={assignmentId}
          revieweeName={farmerProfile?.display_name || "the farmer"}
          existingReview={existingReview}
        />
      ) : null}

      <JobHistory job={job} />
    </div>
  );
}
