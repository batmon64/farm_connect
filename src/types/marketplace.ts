/** Mirrors public.services / service_categories (0004). */
export type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
};

export type Service = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit_type: string | null;
};

/** Mirrors public.provider_profiles (0004). */
export type ProviderProfile = {
  id: string;
  profile_id: string;
  business_name: string | null;
  description: string | null;
  service_radius_km: number | null;
  verification_status: "unverified" | "pending" | "verified";
  rating_average: number | null;
  rating_count: number;
  completed_jobs_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Raw WKB from PostgREST when present — only ever used to check
   * "is a location set", never parsed or displayed client-side. */
  location?: string | null;
};

export type ProviderService = {
  id: string;
  provider_id: string;
  service_id: string;
  description: string | null;
  min_price: number | null;
  max_price: number | null;
  pricing_unit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Machine = {
  id: string;
  provider_id: string;
  name: string;
  machine_type: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Worker = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  worker_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderAvailability = {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

export const JOB_STATUSES = [
  "draft",
  "posted",
  "matching",
  "offers_received",
  "provider_selected",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Mirrors public.farm_jobs (0007) — location intentionally omitted here;
 * it's only ever read directly by the owner or an assigned provider via
 * RLS, never through the shared marketplace types. */
export type FarmJob = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: JobStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: string | null;
  created_at: string;
  updated_at: string;
};

export type JobServiceRequirement = {
  id: string;
  job_id: string;
  service_id: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
};

export type JobMachineRequirement = {
  id: string;
  job_id: string;
  machine_type: string;
  quantity: number;
  operator_required: boolean;
  notes: string | null;
};

export type JobWorkerRequirement = {
  id: string;
  job_id: string;
  worker_count: number;
  skill_requirement: string | null;
  notes: string | null;
};

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "expired";

export type JobOffer = {
  id: string;
  job_id: string;
  provider_id: string;
  price: number | null;
  message: string | null;
  estimated_start: string | null;
  estimated_duration: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
};

export type AssignmentStatus = "assigned" | "confirmed" | "completed" | "cancelled";

export type JobAssignment = {
  id: string;
  job_id: string;
  provider_id: string;
  offer_id: string;
  assigned_at: string;
  accepted_at: string | null;
  status: AssignmentStatus;
};

/** Row shape returned by the discover_jobs(...) RPC (0011) — never
 * includes a raw coordinate, only a computed distance + free-text
 * locality from the farmer's own profile. */
export type DiscoveredJob = {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: string | null;
  created_at: string;
  locality: string | null;
  distance_km: number | null;
  service_names: string[] | null;
  has_matching_service: boolean;
};

/** Row shape returned by get_offers_for_job(...) (0011). */
export type OfferForJob = {
  offer_id: string;
  provider_id: string;
  business_name: string | null;
  description: string | null;
  verification_status: string;
  rating_average: number | null;
  rating_count: number;
  completed_jobs_count: number;
  distance_km: number | null;
  price: number | null;
  message: string | null;
  estimated_start: string | null;
  estimated_duration: string | null;
  status: OfferStatus;
  created_at: string;
};

export type NotificationType = "offer_received" | "offer_accepted" | "system";

/** Mirrors public.notifications (0017). Rows are only ever written by
 * create_notification(), a locked-down SECURITY DEFINER helper called
 * from submit_job_offer / accept_job_offer — never by the client. */
export type Notification = {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** Row shape returned by get_my_offers() (0011). */
export type MyOffer = {
  offer_id: string;
  job_id: string;
  job_title: string;
  job_status: JobStatus;
  job_locality: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: string | null;
  price: number | null;
  message: string | null;
  estimated_start: string | null;
  estimated_duration: string | null;
  status: OfferStatus;
  created_at: string;
};
