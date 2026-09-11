import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, Clock, IndianRupee, Phone, User, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobDetail, getOffersForJob, getAcceptedAssignmentForJob } from "@/features/jobs/queries";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { OfferCard } from "@/features/jobs/components/offer-card";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatBudget,
  formatDate,
  formatDateTime,
  formatDuration,
} from "@/features/marketplace/format";

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

  const isConfirmed = ["provider_selected", "confirmed", "in_progress", "completed"].includes(
    job.status
  );

  const assignment = isConfirmed ? await getAcceptedAssignmentForJob(supabase, jobId) : null;

  let providerContact: { display_name: string | null; phone: string | null } | null = null;
  if (assignment?.provider_profiles?.profile_id) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", assignment.provider_profiles.profile_id)
      .maybeSingle();
    providerContact = data;
  }

  const offers = !isConfirmed ? await getOffersForJob(supabase, jobId) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <p className="text-muted-foreground text-sm">Posted {formatDate(job.created_at)}</p>
        </div>
        <JobStatusBadge status={job.status} />
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

      {isConfirmed && assignment ? (
        <Card className="border-primary">
          <CardContent className="flex flex-col gap-3 pt-5">
            <h2 className="font-medium">Confirmed provider</h2>
            <p className="flex items-center gap-2 text-sm">
              <User className="size-4" aria-hidden />
              {assignment.provider_profiles?.business_name || providerContact?.display_name || "Provider"}
            </p>
            {providerContact?.phone ? (
              <a
                href={`tel:${providerContact.phone}`}
                className="text-primary flex items-center gap-2 text-sm underline underline-offset-4"
              >
                <Phone className="size-4" aria-hidden />
                {providerContact.phone}
              </a>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="font-medium">
            Offers {offers.length > 0 ? `(${offers.length})` : ""}
          </h2>
          {offers.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No offers yet."
              description="We'll show them here when providers respond."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {offers.map((offer) => (
                <OfferCard key={offer.offer_id} offer={offer} jobId={job.id} canAccept />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
