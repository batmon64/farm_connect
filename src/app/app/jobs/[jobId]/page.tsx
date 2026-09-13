import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, Clock, IndianRupee, Phone, User, Inbox, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobDetail, getOffersForJob, getAcceptedAssignmentForJob } from "@/features/jobs/queries";
import { JobStatusLine } from "@/features/jobs/components/job-status-line";
import { JobTimeline } from "@/features/jobs/components/job-timeline";
import { JobLifecycleActions } from "@/features/jobs/components/job-lifecycle-actions";
import { JobHistory } from "@/features/jobs/components/job-history";
import { OfferCard } from "@/features/jobs/components/offer-card";
import { OfferComparisonTable } from "@/features/jobs/components/offer-comparison-table";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { formatBudget, formatDateTime, formatDuration } from "@/features/marketplace/format";

export const metadata: Metadata = { title: "Job details — FarmConnect" };

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createClient();

  const detail = await getJobDetail(supabase, jobId);
  if (!detail) notFound();
  const { job, services, machineRequirements, workerRequirements } = detail;

  const isConfirmedOrLater = ["confirmed", "in_progress", "completed", "cancelled"].includes(
    job.status
  );

  const [assignmentResult, farmerProfileResult] = await Promise.all([
    isConfirmedOrLater ? getAcceptedAssignmentForJob(supabase, jobId) : Promise.resolve(null),
    supabase.from("profiles").select("location").eq("id", job.created_by).maybeSingle(),
  ]);
  const assignment = assignmentResult;
  const locality = farmerProfileResult.data?.location ?? null;

  let providerContact: { display_name: string | null; phone: string | null } | null = null;
  if (assignment?.provider_profiles?.profile_id) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", assignment.provider_profiles.profile_id)
      .maybeSingle();
    providerContact = data;
  }

  const offers = !isConfirmedOrLater ? await getOffersForJob(supabase, jobId) : [];
  const providerName = assignment?.provider_profiles?.business_name || providerContact?.display_name || "Provider";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">{job.title}</h1>
        {locality ? (
          <p className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            <MapPin className="size-3.5" aria-hidden />
            {locality}
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
            {job.scheduled_start && job.scheduled_end ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {formatDuration(
                  `${Math.round(
                    (new Date(job.scheduled_end).getTime() - new Date(job.scheduled_start).getTime()) /
                      3600000
                  )}:00:00`
                )}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="size-4" aria-hidden />
              {formatBudget(job.budget_min, job.budget_max, job.budget_type)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
            {services.map((s) => (
              <p key={s.id}>
                <span className="font-medium">{s.services?.name ?? "Service"}</span>
                {s.quantity ? ` — ${s.quantity} ${s.unit ?? s.services?.unit_type ?? ""}` : ""}
              </p>
            ))}
            {workerRequirements.map((w) => (
              <p key={w.id} className="text-muted-foreground">
                {w.worker_count} worker{w.worker_count > 1 ? "s" : ""}
                {w.skill_requirement ? ` — ${w.skill_requirement}` : ""}
              </p>
            ))}
            {machineRequirements.map((m) => (
              <p key={m.id} className="text-muted-foreground">
                {m.quantity} × {m.machine_type}
                {m.operator_required ? " (with operator)" : ""}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {isConfirmedOrLater && assignment ? (
        <>
          <Card>
            <CardContent className="pt-5">
              <JobTimeline status={job.status} />
            </CardContent>
          </Card>

          <Card className={job.status === "cancelled" ? "border-destructive" : "border-primary"}>
            <CardContent className="flex flex-col gap-3 pt-5">
              <div>
                <p className="text-muted-foreground text-xs">Provider</p>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <User className="size-4" aria-hidden />
                  {providerName}
                </p>
              </div>
              {providerContact?.phone ? (
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <a
                    href={`tel:${providerContact.phone}`}
                    className="text-primary flex items-center gap-2 text-sm underline underline-offset-4"
                  >
                    <Phone className="size-4" aria-hidden />
                    {providerContact.phone}
                  </a>
                </div>
              ) : null}

              {job.status === "confirmed" ? (
                <p className="text-muted-foreground text-sm">Waiting for work to begin.</p>
              ) : job.status === "in_progress" && job.started_at ? (
                <p className="text-muted-foreground text-sm">
                  Started {formatDateTime(job.started_at)}.
                </p>
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

          <JobLifecycleActions jobId={job.id} status={job.status} viewerRole="farmer" />

          <JobHistory job={job} />
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="font-medium">
            {offers.length > 0 ? `${offers.length} offer${offers.length === 1 ? "" : "s"} received` : "Offers"}
          </h2>
          {offers.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Your job is live."
              description="Providers can now send you offers."
            />
          ) : (
            <>
              <OfferComparisonTable offers={offers} jobId={job.id} canAccept />
              <div className="flex flex-col gap-3 md:hidden">
                {offers.map((offer) => (
                  <OfferCard key={offer.offer_id} offer={offer} jobId={job.id} canAccept />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
