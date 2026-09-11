import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FarmJob,
  JobMachineRequirement,
  JobServiceRequirement,
  JobWorkerRequirement,
  OfferForJob,
  ServiceCategory,
  Service,
} from "@/types/marketplace";

export type AcceptedAssignment = {
  id: string;
  job_id: string;
  provider_id: string;
  offer_id: string;
  status: string;
  assigned_at: string;
  provider_profiles: { business_name: string | null; description: string | null; profile_id: string } | null;
};

export async function listMyJobs(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("farm_jobs")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FarmJob[];
}

export async function getJobDetail(supabase: SupabaseClient, jobId: string) {
  const { data: job, error } = await supabase
    .from("farm_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;

  const [{ data: services }, { data: machineReqs }, { data: workerReqs }] = await Promise.all([
    supabase
      .from("job_services")
      .select("*, services(name, unit_type)")
      .eq("job_id", jobId),
    supabase.from("job_machine_requirements").select("*").eq("job_id", jobId),
    supabase.from("job_worker_requirements").select("*").eq("job_id", jobId),
  ]);

  return {
    job: job as FarmJob,
    services: (services ?? []) as (JobServiceRequirement & {
      services: { name: string; unit_type: string | null } | null;
    })[],
    machineRequirements: (machineReqs ?? []) as JobMachineRequirement[],
    workerRequirements: (workerReqs ?? []) as JobWorkerRequirement[],
  };
}

export async function getOffersForJob(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase.rpc("get_offers_for_job", { p_job_id: jobId });
  if (error) throw error;
  return (data ?? []) as OfferForJob[];
}

export async function listServiceCatalogue(supabase: SupabaseClient) {
  const [{ data: categories, error: catError }, { data: services, error: svcError }] =
    await Promise.all([
      supabase.from("service_categories").select("id, name, description").order("name"),
      supabase.from("services").select("id, category_id, name, description, unit_type").order("name"),
    ]);
  if (catError) throw catError;
  if (svcError) throw svcError;
  return {
    categories: (categories ?? []) as ServiceCategory[],
    services: (services ?? []) as Service[],
  };
}

export async function getAcceptedAssignmentForJob(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase
    .from("job_assignments")
    .select("*, provider_profiles(business_name, description, profile_id)")
    .eq("job_id", jobId)
    .in("status", ["assigned", "confirmed"])
    .maybeSingle();
  if (error) throw error;
  return data as AcceptedAssignment | null;
}
