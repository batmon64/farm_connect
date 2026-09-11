import type { SupabaseClient } from "@supabase/supabase-js";
import type {
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

export async function discoverJobs(supabase: SupabaseClient, jobId?: string) {
  const { data, error } = await supabase.rpc("discover_jobs", {
    p_job_id: jobId ?? null,
    p_max_distance_km: null,
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

export async function getJobCoordinates(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase.rpc("get_job_coordinates", { p_job_id: jobId });
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.longitude == null || row.latitude == null) return null;
  return { longitude: row.longitude as number, latitude: row.latitude as number };
}
