-- Phase 7: discover_jobs() gains explainable match facts (service,
-- radius, schedule, workload, machine, worker, budget) computed once
-- per row via the "scored" CTE, plus a match_tier summary. The
-- 'recommended' sort now orders by match_tier first, then distance --
-- this is still plain deterministic SQL ordering, not AI, and the
-- label change to "Best matches" happens only in the UI layer.
-- Every new fact is a self-check against the CALLING provider's own
-- data (the existing `me` CTE pattern) -- no new cross-user read.
drop function if exists public.discover_jobs(uuid, numeric, uuid, timestamptz, timestamptz, numeric, numeric, text);

create or replace function public.discover_jobs(
  p_job_id uuid default null,
  p_max_distance_km numeric default null,
  p_service_id uuid default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_sort text default 'recommended'
)
returns table (
  id uuid,
  title text,
  description text,
  status text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  budget_min numeric,
  budget_max numeric,
  budget_type text,
  created_at timestamptz,
  updated_at timestamptz,
  locality text,
  distance_km numeric,
  service_names text[],
  has_matching_service boolean,
  my_offer_status text,
  requirement_summary text,
  offer_count integer,
  within_service_radius boolean,
  schedule_available boolean,
  has_workload_conflict boolean,
  machine_match boolean,
  worker_match boolean,
  budget_fit boolean,
  match_tier text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with me as (
    select id as provider_id, location as provider_location, service_radius_km
    from public.provider_profiles
    where profile_id = (select auth.uid())
  ),
  base as (
    select
      fj.id, fj.title, fj.description, fj.status,
      fj.scheduled_start, fj.scheduled_end,
      fj.budget_min, fj.budget_max, fj.budget_type,
      fj.created_at, fj.updated_at,
      p.location as farmer_locality,
      me.provider_id,
      me.service_radius_km,
      case when me.provider_location is not null and fj.location is not null
        then round((ST_Distance(me.provider_location, fj.location) / 1000)::numeric, 1)
        else null end as distance_km
    from public.farm_jobs fj
    join public.profiles p on p.id = fj.created_by
    cross join me
    where fj.status in ('posted', 'matching', 'offers_received')
      and (p_job_id is null or fj.id = p_job_id)
      and (
        p_max_distance_km is null or me.provider_location is null or fj.location is null
        or ST_DWithin(me.provider_location, fj.location, p_max_distance_km * 1000)
      )
      and (
        p_service_id is null or exists (
          select 1 from public.job_services js
          where js.job_id = fj.id and js.service_id = p_service_id
        )
      )
      and (p_date_from is null or fj.scheduled_start >= p_date_from)
      and (p_date_to is null or fj.scheduled_start <= p_date_to)
      and (p_budget_min is null or fj.budget_max is null or fj.budget_max >= p_budget_min)
      and (p_budget_max is null or fj.budget_min is null or fj.budget_min <= p_budget_max)
  ),
  scored as (
    select
      base.*,
      public.provider_service_match_ratio(provider_id, id) as service_ratio,
      (service_radius_km is null) as radius_unknown,
      (service_radius_km is not null and distance_km is not null and distance_km <= service_radius_km) as within_radius_raw,
      public.provider_available_for_schedule(provider_id, scheduled_start, scheduled_end) as schedule_available,
      public.provider_has_workload_conflict(provider_id, id, scheduled_start, scheduled_end) as has_workload_conflict,
      public.provider_has_matching_machine(provider_id, id) as machine_match,
      public.provider_has_matching_workers(provider_id, id) as worker_match,
      public.provider_budget_fit(provider_id, id) as budget_fit
    from base
  )
  select
    scored.id, scored.title, scored.description, scored.status,
    scored.scheduled_start, scored.scheduled_end,
    scored.budget_min, scored.budget_max, scored.budget_type,
    scored.created_at, scored.updated_at,
    scored.farmer_locality,
    scored.distance_km,
    (
      select array_agg(distinct s.name order by s.name)
      from public.job_services js join public.services s on s.id = js.service_id
      where js.job_id = scored.id
    ),
    coalesce(scored.service_ratio, 0) > 0,
    (
      select jo2.status from public.job_offers jo2
      where jo2.job_id = scored.id and jo2.provider_id = scored.provider_id
      order by jo2.created_at desc
      limit 1
    ),
    (
      select string_agg(trim(concat_ws(' ', js.quantity::text, js.unit)), ', ')
      from public.job_services js
      where js.job_id = scored.id and js.quantity is not null
    ),
    (
      select count(*)::int from public.job_offers jo3 where jo3.job_id = scored.id
    ),
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
    case when p_sort = 'nearest' then scored.distance_km end asc nulls last,
    case when p_sort = 'newest' then scored.created_at end desc,
    case when p_sort = 'budget' then coalesce(scored.budget_max, scored.budget_min) end desc nulls last,
    case when p_sort = 'earliest' then scored.scheduled_start end asc nulls last,
    case when p_sort = 'recommended' then
      case public.job_match_tier(
        scored.service_ratio,
        case when scored.radius_unknown then null else scored.within_radius_raw end,
        scored.schedule_available,
        scored.has_workload_conflict,
        scored.machine_match,
        scored.worker_match,
        scored.budget_fit
      )
      when 'strong' then 0 when 'good' then 1 when 'fair' then 2 else 3 end
    end asc,
    scored.distance_km asc nulls last,
    scored.scheduled_start asc nulls last,
    scored.created_at desc;
$$;

revoke execute on function public.discover_jobs(uuid, numeric, uuid, timestamptz, timestamptz, numeric, numeric, text) from public, anon;
grant execute on function public.discover_jobs(uuid, numeric, uuid, timestamptz, timestamptz, numeric, numeric, text) to authenticated;
