import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, IndianRupee, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/profile";
import { getMyProviderProfile, discoverJobs } from "@/features/provider/queries";
import { SubmitOfferForm } from "@/features/provider/components/submit-offer-form";
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
  if (!job) notFound();

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
        <h1 className="text-xl font-semibold">{job.title}</h1>
        <p className="text-muted-foreground text-sm">Posted {formatDate(job.created_at)}</p>
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
            <h2 className="mb-4 font-medium">Make an Offer</h2>
            <SubmitOfferForm jobId={jobId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
