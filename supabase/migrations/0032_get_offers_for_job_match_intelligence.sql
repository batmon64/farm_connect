-- Phase 7: get_offers_for_job() gains the same explainable match facts,
-- computed for each OFFERING provider against this one job -- still
-- only derived booleans/aggregates about that provider (never raw
-- machines/workers rows), exactly matching the existing precedent of
-- returning service_names instead of raw provider_services. Default
-- order becomes: accepted offer first, then match_tier, then
-- reputation (Bayesian-damped, never zero for a new provider), then
-- distance, then recency -- replacing the previous plain
-- created_at desc. This directly answers "which provider is the best
-- fit," not just "who offered first," without ever sorting by price.
--
-- NOTE: this version has a real bug -- language plpgsql RETURNS TABLE
-- column names become implicitly-declared variables throughout the
-- function body, and the "scored" CTE below references several bare
-- column names (provider_id, distance_km, status, created_at, ...)
-- that collide with output columns of the same name, causing "column
-- reference is ambiguous". Found immediately during live testing and
-- fixed properly in 0035_fix_get_offers_for_job_column_ambiguity.sql
-- (every reference qualified with base./scored.) -- kept here exactly
-- as first applied, for an honest migration history.
drop function if exists public.get_offers_for_job(uuid);

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
      jo.id as offer_id, jo.provider_id, pp.business_name, pp.description,
      pp.verification_status, pp.rating_average, pp.rating_count, pp.completed_jobs_count,
      pp.service_radius_km,
      case when pp.location is not null and fj.location is not null
        then round((ST_Distance(pp.location, fj.location) / 1000)::numeric, 1)
        else null end as distance_km,
      jo.price, jo.message, jo.estimated_start, jo.estimated_duration, jo.status, jo.created_at,
      fj.scheduled_start, fj.scheduled_end
    from public.job_offers jo
    join public.provider_profiles pp on pp.id = jo.provider_id
    join public.farm_jobs fj on fj.id = jo.job_id
    where jo.job_id = p_job_id
  ),
  scored as (
    select
      base.*,
      public.provider_service_match_ratio(provider_id, p_job_id) as service_ratio,
      (service_radius_km is null) as radius_unknown,
      (service_radius_km is not null and distance_km is not null and distance_km <= service_radius_km) as within_radius_raw,
      public.provider_available_for_schedule(provider_id, scheduled_start, scheduled_end) as schedule_available,
      public.provider_has_workload_conflict(provider_id, p_job_id, scheduled_start, scheduled_end) as has_workload_conflict,
      public.provider_has_matching_machine(provider_id, p_job_id) as machine_match,
      public.provider_has_matching_workers(provider_id, p_job_id) as worker_match,
      public.provider_budget_fit(provider_id, p_job_id) as budget_fit
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
