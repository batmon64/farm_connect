-- Fixes a real bug found during live testing immediately after the
-- previous migration: get_offers_for_job is language plpgsql, where
-- every RETURNS TABLE column name becomes an implicitly-declared
-- variable in scope for the whole function body. The "scored" CTE's
-- unqualified column references (provider_id, distance_km, status,
-- created_at, ...) collided with those output-column variables of the
-- same bare name, and Postgres correctly refused to guess which one
-- was meant ("column reference is ambiguous"). Every reference inside
-- the CTE is now qualified with base./scored. -- logic is otherwise
-- unchanged from the previous migration.
create or replace function public.get_offers_for_job(p_job_id uuid)
returns table (
  offer_id uuid,
  provider_id uuid,
  business_name text,
  description text,
  verification_status text,
  rating_average numeric,
  rating_count integer,
  completed_jobs_count integer,
  service_names text[],
  distance_km numeric,
  price numeric,
  message text,
  estimated_start timestamptz,
  estimated_duration interval,
  status text,
  created_at timestamptz,
  within_service_radius boolean,
  schedule_available boolean,
  has_workload_conflict boolean,
  machine_match boolean,
  worker_match boolean,
  budget_fit boolean,
  match_tier text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.owns_farm_job(p_job_id) then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select
      jo.id as offer_id, jo.provider_id as provider_id, pp.business_name as business_name,
      pp.description as description, pp.verification_status as verification_status,
      pp.rating_average as rating_average, pp.rating_count as rating_count,
      pp.completed_jobs_count as completed_jobs_count, pp.service_radius_km as service_radius_km,
      case when pp.location is not null and fj.location is not null
        then round((ST_Distance(pp.location, fj.location) / 1000)::numeric, 1)
        else null end as distance_km,
      jo.price as price, jo.message as message, jo.estimated_start as estimated_start,
      jo.estimated_duration as estimated_duration, jo.status as status, jo.created_at as created_at,
      fj.scheduled_start as scheduled_start, fj.scheduled_end as scheduled_end
    from public.job_offers jo
    join public.provider_profiles pp on pp.id = jo.provider_id
    join public.farm_jobs fj on fj.id = jo.job_id
    where jo.job_id = p_job_id
  ),
  scored as (
    select
      base.*,
      public.provider_service_match_ratio(base.provider_id, p_job_id) as service_ratio,
      (base.service_radius_km is null) as radius_unknown,
      (base.service_radius_km is not null and base.distance_km is not null and base.distance_km <= base.service_radius_km) as within_radius_raw,
      public.provider_available_for_schedule(base.provider_id, base.scheduled_start, base.scheduled_end) as schedule_available,
      public.provider_has_workload_conflict(base.provider_id, p_job_id, base.scheduled_start, base.scheduled_end) as has_workload_conflict,
      public.provider_has_matching_machine(base.provider_id, p_job_id) as machine_match,
      public.provider_has_matching_workers(base.provider_id, p_job_id) as worker_match,
      public.provider_budget_fit(base.provider_id, p_job_id) as budget_fit
    from base
  )
  select
    scored.offer_id, scored.provider_id, scored.business_name, scored.description, scored.verification_status,
    scored.rating_average, scored.rating_count, scored.completed_jobs_count,
    (
      select array_agg(distinct s.name order by s.name)
      from public.provider_services ps join public.services s on s.id = ps.service_id
      where ps.provider_id = scored.provider_id and ps.is_active
    ),
    scored.distance_km,
    scored.price, scored.message, scored.estimated_start, scored.estimated_duration, scored.status, scored.created_at,
    case when scored.radius_unknown then null else scored.within_radius_raw end,
    scored.schedule_available,
    scored.has_workload_conflict,
    scored.machine_match,
    scored.worker_match,
    scored.budget_fit,
    public.job_match_tier(
      scored.service_ratio,
      case when scored.radius_unknown then null else scored.within_radius_raw end,
      scored.schedule_available,
      scored.has_workload_conflict,
      scored.machine_match,
      scored.worker_match,
      scored.budget_fit
    )
  from scored
  order by
    (scored.status = 'accepted') desc,
    case public.job_match_tier(
      scored.service_ratio,
      case when scored.radius_unknown then null else scored.within_radius_raw end,
      scored.schedule_available,
      scored.has_workload_conflict,
      scored.machine_match,
      scored.worker_match,
      scored.budget_fit
    )
    when 'strong' then 0 when 'good' then 1 when 'fair' then 2 else 3 end asc,
    public.provider_trust_score(scored.rating_average, scored.rating_count) desc,
    scored.distance_km asc nulls last,
    scored.created_at desc;
end;
$$;

revoke execute on function public.get_offers_for_job(uuid) from public, anon;
grant execute on function public.get_offers_for_job(uuid) to authenticated;
