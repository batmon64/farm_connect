"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MarketplaceFormState } from "@/features/marketplace/types";

async function requireProviderId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("provider_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function upsertProviderProfileAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const businessName = formData.get("businessName");
  const description = formData.get("description");
  const serviceRadiusKm = formData.get("serviceRadiusKm");
  const isActive = formData.get("isActive") === "on";
  const latitude = formData.get("latitude");
  const longitude = formData.get("longitude");

  if (typeof businessName !== "string" || !businessName.trim()) {
    return {
      status: "error",
      fieldErrors: { businessName: ["Business name is required"] },
      message: "Please fix the errors below.",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

    const payload: Record<string, unknown> = {
      profile_id: user.id,
      business_name: businessName.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      service_radius_km:
        typeof serviceRadiusKm === "string" && serviceRadiusKm ? Number(serviceRadiusKm) : null,
      is_active: isActive,
    };

    // Only touch location when new coordinates were actually captured this
    // submit — omitting the key (rather than sending null) means an
    // upsert leaves any existing location untouched.
    if (typeof latitude === "string" && latitude && typeof longitude === "string" && longitude) {
      payload.location = `SRID=4326;POINT(${longitude} ${latitude})`;
    }

    const { error } = await supabase
      .from("provider_profiles")
      .upsert(payload, { onConflict: "profile_id" });

    if (error) return { status: "error", message: "Could not save your provider profile." };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }

  revalidatePath("/app/provider/profile");
  revalidatePath("/app/provider");
  return { status: "success", message: "Provider profile saved." };
}

export async function addProviderServiceAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const serviceId = formData.get("serviceId");
  const description = formData.get("description");
  const minPrice = formData.get("minPrice");
  const maxPrice = formData.get("maxPrice");
  const pricingUnit = formData.get("pricingUnit");

  if (typeof serviceId !== "string" || !serviceId) {
    return { status: "error", message: "Choose a service first." };
  }

  const supabase = await createClient();
  const providerId = await requireProviderId(supabase);
  if (!providerId) return { status: "error", message: "Set up your provider profile first." };

  const { error } = await supabase.from("provider_services").insert({
    provider_id: providerId,
    service_id: serviceId,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    min_price: typeof minPrice === "string" && minPrice ? Number(minPrice) : null,
    max_price: typeof maxPrice === "string" && maxPrice ? Number(maxPrice) : null,
    pricing_unit: typeof pricingUnit === "string" && pricingUnit.trim() ? pricingUnit.trim() : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "You've already added this service." };
    }
    return { status: "error", message: "Could not add this service. Please try again." };
  }

  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Service added." };
}

export async function toggleProviderServiceAction(formData: FormData) {
  const id = formData.get("id");
  const isActive = formData.get("isActive") === "true";
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("provider_services").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/app/provider/profile");
}

export async function removeProviderServiceAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("provider_services").delete().eq("id", id);
  revalidatePath("/app/provider/profile");
}

export async function addMachineAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const name = formData.get("name");
  const machineType = formData.get("machineType");
  const brand = formData.get("brand");
  const model = formData.get("model");
  const quantity = formData.get("quantity");
  const serviceId = formData.get("serviceId");

  if (typeof name !== "string" || !name.trim()) {
    return { status: "error", fieldErrors: { name: ["Name is required"] }, message: "Please fix the errors below." };
  }

  const supabase = await createClient();
  const providerId = await requireProviderId(supabase);
  if (!providerId) return { status: "error", message: "Set up your provider profile first." };

  const { data: machine, error } = await supabase
    .from("machines")
    .insert({
      provider_id: providerId,
      name: name.trim(),
      machine_type: typeof machineType === "string" && machineType.trim() ? machineType.trim() : null,
      brand: typeof brand === "string" && brand.trim() ? brand.trim() : null,
      model: typeof model === "string" && model.trim() ? model.trim() : null,
      quantity: typeof quantity === "string" && quantity ? Number(quantity) : 1,
    })
    .select("id")
    .single();

  if (error || !machine) {
    return { status: "error", message: "Could not add this machine. Please try again." };
  }

  if (typeof serviceId === "string" && serviceId) {
    await supabase.from("machine_services").insert({ machine_id: machine.id, service_id: serviceId });
  }

  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Machine added." };
}

export async function toggleMachineAction(formData: FormData) {
  const id = formData.get("id");
  const isActive = formData.get("isActive") === "true";
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("machines").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/app/provider/profile");
}

export async function addWorkerAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const name = formData.get("name");
  const workerType = formData.get("workerType");

  if (typeof name !== "string" || !name.trim()) {
    return { status: "error", fieldErrors: { name: ["Name is required"] }, message: "Please fix the errors below." };
  }

  const supabase = await createClient();
  const providerId = await requireProviderId(supabase);
  if (!providerId) return { status: "error", message: "Set up your provider profile first." };

  const { error } = await supabase.from("workers").insert({
    provider_id: providerId,
    name: name.trim(),
    worker_type: typeof workerType === "string" && workerType.trim() ? workerType.trim() : null,
  });

  if (error) return { status: "error", message: "Could not add this worker. Please try again." };

  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Worker added." };
}

export async function toggleWorkerAction(formData: FormData) {
  const id = formData.get("id");
  const isActive = formData.get("isActive") === "true";
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("workers").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/app/provider/profile");
}

export async function addTeamAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { status: "error", fieldErrors: { name: ["Name is required"] }, message: "Please fix the errors below." };
  }

  const supabase = await createClient();
  const providerId = await requireProviderId(supabase);
  if (!providerId) return { status: "error", message: "Set up your provider profile first." };

  const { error } = await supabase.from("teams").insert({ provider_id: providerId, name: name.trim() });
  if (error) return { status: "error", message: "Could not add this team. Please try again." };

  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Team added." };
}

export async function addTeamWorkerAction(formData: FormData) {
  const teamId = formData.get("teamId");
  const workerId = formData.get("workerId");
  if (typeof teamId !== "string" || typeof workerId !== "string" || !workerId) return;
  const supabase = await createClient();
  const { error } = await supabase.from("team_workers").insert({ team_id: teamId, worker_id: workerId });
  if (!error) {
    const { count } = await supabase
      .from("team_workers")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);
    await supabase.from("teams").update({ member_count: count ?? 0 }).eq("id", teamId);
  }
  revalidatePath("/app/provider/profile");
}

export async function removeTeamWorkerAction(formData: FormData) {
  const teamId = formData.get("teamId");
  const workerId = formData.get("workerId");
  if (typeof teamId !== "string" || typeof workerId !== "string") return;
  const supabase = await createClient();
  await supabase.from("team_workers").delete().eq("team_id", teamId).eq("worker_id", workerId);
  const { count } = await supabase
    .from("team_workers")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);
  await supabase.from("teams").update({ member_count: count ?? 0 }).eq("id", teamId);
  revalidatePath("/app/provider/profile");
}

export async function addAvailabilityAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const dayOfWeek = formData.get("dayOfWeek");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  if (typeof dayOfWeek !== "string" || typeof startTime !== "string" || typeof endTime !== "string") {
    return { status: "error", message: "Please fix the errors below." };
  }
  if (startTime >= endTime) {
    return { status: "error", message: "Start time must be before end time." };
  }

  const supabase = await createClient();
  const providerId = await requireProviderId(supabase);
  if (!providerId) return { status: "error", message: "Set up your provider profile first." };

  const { error } = await supabase.from("provider_availability").insert({
    provider_id: providerId,
    day_of_week: Number(dayOfWeek),
    start_time: startTime,
    end_time: endTime,
  });

  if (error) return { status: "error", message: "Could not save availability. Please try again." };

  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Availability added." };
}

export async function removeAvailabilityAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("provider_availability").delete().eq("id", id);
  revalidatePath("/app/provider/profile");
}

export async function submitOfferAction(
  _prev: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const jobId = formData.get("jobId");
  const price = formData.get("price");
  const message = formData.get("message");
  const estimatedStartDate = formData.get("estimatedStartDate");
  const estimatedStartTime = formData.get("estimatedStartTime");
  const estimatedDurationHours = formData.get("estimatedDurationHours");

  if (typeof jobId !== "string") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const supabase = await createClient();
  const providerId = await requireProviderId(supabase);
  if (!providerId) return { status: "error", message: "Set up your provider profile first." };

  let estimatedStart: string | null = null;
  if (typeof estimatedStartDate === "string" && estimatedStartDate && typeof estimatedStartTime === "string" && estimatedStartTime) {
    const d = new Date(`${estimatedStartDate}T${estimatedStartTime}:00`);
    if (!Number.isNaN(d.getTime())) estimatedStart = d.toISOString();
  }

  const duration =
    typeof estimatedDurationHours === "string" && estimatedDurationHours
      ? `${Number(estimatedDurationHours)} hours`
      : null;

  const { error } = await supabase.rpc("submit_job_offer", {
    p_job_id: jobId,
    p_provider_id: providerId,
    p_price: typeof price === "string" && price ? Number(price) : null,
    p_message: typeof message === "string" && message.trim() ? message.trim() : null,
    p_estimated_start: estimatedStart,
    p_estimated_duration: duration,
  });

  if (error) {
    if (error.message.includes("job_offers_one_pending_per_provider_job")) {
      return { status: "error", message: "You already have a pending offer on this job." };
    }
    return { status: "error", message: "Could not submit your offer. Please try again." };
  }

  revalidatePath("/app/provider/offers");
  redirect("/app/provider/offers");
}
