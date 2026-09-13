"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createJobSchema } from "./schemas";
import type { MarketplaceFormState } from "@/features/marketplace/types";

export async function createJobAction(
  _prevState: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const parsed = createJobSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  const scheduledStart = new Date(`${data.scheduledDate}T${data.startTime}:00`);
  if (Number.isNaN(scheduledStart.getTime())) {
    return { status: "error", message: "Invalid date or time." };
  }
  const scheduledEnd = new Date(scheduledStart.getTime() + data.durationHours * 60 * 60 * 1000);

  const budgetAmount = data.budgetFlexible ? null : data.budgetAmount ?? null;

  let jobId: string;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { status: "error", message: "Your session has expired. Please log in again." };
    }

    const { data: newJobId, error } = await supabase.rpc("create_farm_job", {
      p_service_id: data.serviceId,
      p_title: data.title,
      p_description: data.description || null,
      p_quantity: data.quantity ?? null,
      p_unit: data.unit || null,
      p_notes: data.notes || null,
      p_needs_workers: data.needsWorkers,
      p_worker_count: data.workerCount ?? null,
      p_skill_requirement: data.skillRequirement || null,
      p_needs_machine: data.needsMachine,
      p_machine_type: data.machineType || null,
      p_machine_quantity: data.machineQuantity ?? null,
      p_operator_required: data.operatorRequired ?? true,
      p_scheduled_start: scheduledStart.toISOString(),
      p_scheduled_end: scheduledEnd.toISOString(),
      p_longitude: data.longitude ?? null,
      p_latitude: data.latitude ?? null,
      p_budget_min: budgetAmount,
      p_budget_max: budgetAmount,
      p_budget_type: data.budgetFlexible ? "negotiable" : data.budgetType || "fixed",
    });

    if (error || !newJobId) {
      return { status: "error", message: "Could not create your job. Please try again." };
    }
    jobId = newJobId as string;
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }

  revalidatePath("/app/jobs");
  revalidatePath("/app");
  redirect(`/app/jobs/${jobId}`);
}

export async function acceptOfferAction(
  _prevState: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const offerId = formData.get("offerId");
  const jobId = formData.get("jobId");
  if (typeof offerId !== "string" || typeof jobId !== "string") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_job_offer", { p_offer_id: offerId });

    if (error) {
      if (error.message.includes("job_assignments_single_active_per_job")) {
        return {
          status: "error",
          message: "This job already has an accepted provider.",
        };
      }
      return { status: "error", message: "Could not accept this offer. Please try again." };
    }
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }

  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app/jobs");
  redirect(`/app/jobs/${jobId}`);
}

export async function transitionJobStatusAction(
  _prevState: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const jobId = formData.get("jobId");
  const action = formData.get("action");
  const cancellationReason = formData.get("cancellationReason");

  if (typeof jobId !== "string" || typeof action !== "string") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_job_status", {
      p_job_id: jobId,
      p_action: action,
      p_cancellation_reason:
        typeof cancellationReason === "string" && cancellationReason.trim()
          ? cancellationReason.trim()
          : null,
    });

    if (error) {
      if (error.message.includes("not authorized") || error.message.startsWith("only the")) {
        return { status: "error", message: "You're not able to do that for this job." };
      }
      if (error.message.includes("job is not in a") || error.message.includes("status changed")) {
        return {
          status: "error",
          message: "This job's status just changed. Please refresh and try again.",
        };
      }
      return { status: "error", message: "Could not update this job. Please try again." };
    }
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }

  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath(`/app/provider/jobs/${jobId}`);
  revalidatePath("/app/jobs");
  revalidatePath("/app/provider");
  revalidatePath("/app");
  return { status: "success", message: "Job updated." };
}
