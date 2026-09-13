import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DiscoverJobsFilters,
  DiscoveredJob,
  Machine,
  MyOffer,
  ProviderAvailability,
  ProviderProfile,
  ProviderService,
  Team,
  Worker,
} from "@/types/marketplace";

export async function getMyProviderProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderProfile | null;
}

export async function listMyProviderServices(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("provider_services")
    .select("*, services(name, unit_type, category_id)")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (ProviderService & {
    services: { name: string; unit_type: string | null; category_id: string } | null;
  })[];
}

export async function listMyMachines(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("machines")
    .select("*, machine_services(service_id, services(name))")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Machine & {
    machine_services: { service_id: string; services: { name: string } | null }[];
  })[];
}

export async function listMyWorkers(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Worker[];
}

export async function listMyTeams(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*, team_workers(worker_id, workers(name))")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Team & {
    team_workers: { worker_id: string; workers: { name: string } | null }[];
  })[];
}

export async function listMyAvailability(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("provider_availability")
    .select("*")
    .eq("provider_id", providerId)
    .order("day_of_week", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProviderAvailability[];
}

export async function discoverJobs(
  supabase: SupabaseClient,
  jobId?: string,
  filters?: DiscoverJobsFilters
) {
  const { data, error } = await supabase.rpc("discover_jobs", {
    p_job_id: jobId ?? null,
    p_max_distance_km: filters?.maxDistanceKm ?? null,
    p_service_id: filters?.serviceId ?? null,
    p_date_from: filters?.dateFrom ?? null,
    p_date_to: filters?.dateTo ?? null,
    p_budget_min: filters?.budgetMin ?? null,
    p_budget_max: filters?.budgetMax ?? null,
    p_sort: filters?.sort ?? "recommended",
  });
  if (error) throw error;
  return (data ?? []) as DiscoveredJob[];
}

export async function getMyOffers(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_my_offers");
  if (error) throw error;
  return (data ?? []) as MyOffer[];
}

export async function listMyConfirmedWork(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("job_assignments")
    .select(
      "*, farm_jobs(id, created_by, title, status, scheduled_start, scheduled_end, budget_min, budget_max, budget_type)"
    )
    .eq("provider_id", providerId)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** The calling provider's assignment for one specific job, with the
 * full farm_jobs row and farmer contact — both genuinely readable once
 * an active assignment exists (see 0011's counterparty RLS). Used for
 * the provider-side job detail page once a job has left the open/
 * discoverable set (discover_jobs only returns posted-family jobs), so
 * a confirmed/in_progress/completed/cancelled job still has somewhere
 * to render for its assigned provider. RLS (job owner or the assigned
 * provider) is the actual authorization boundary here — this query
 * simply returns nothing for a job this caller isn't part of. */
export async function getMyAssignmentForJob(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase
    .from("job_assignments")
    .select(
      "*, farm_jobs(*), provider_profiles(id, business_name, profile_id)"
    )
    .eq("job_id", jobId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as
    | {
        id: string;
        job_id: string;
        provider_id: string;
        status: string;
        farm_jobs: import("@/types/marketplace").FarmJob | null;
        provider_profiles: { id: string; business_name: string | null; profile_id: string } | null;
      }
    | null;
}

export async function getJobCoordinates(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase.rpc("get_job_coordinates", { p_job_id: jobId });
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.longitude == null || row.latitude == null) return null;
  return { longitude: row.longitude as number, latitude: row.latitude as number };
}
