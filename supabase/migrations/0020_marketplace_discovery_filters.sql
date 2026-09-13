-- Phase 3D: marketplace discovery filters, sorting, and richer job-card
-- data — all inside discover_jobs() rather than new endpoints, so the
-- SECURITY DEFINER column allowlist (see 0011) stays the single place
-- that decides what a provider is allowed to see about a job.
--
-- New optional parameters (all default to "no filter", so every existing
-- caller with the old 2-arg signature keeps working unchanged):
--   p_service_id   — only jobs needing this exact service
--   p_date_from/to — scheduled_start range (inclusive); the client
--                    computes these from a "today/tomorrow/this week"
--                    preset, the RPC only ever sees a plain range
--   p_budget_min/max — overlap test against the job's budget range;
--                    a job with no budget set (flexible) always passes,
--                    since we can't say it's excluded by a range we
--                    don't know it violates
--   p_sort         — 'recommended' (default, unchanged ranking) |
--                    'nearest' | 'newest' | 'budget' | 'earliest'
--
-- New returned columns:
--   updated_at         — farm_jobs.updated_at, for a "posted vs updated"
--                        distinction on the card
--   my_offer_status    — the calling provider's own latest offer status
--                        on this job, or null if they haven't offered
--   requirement_summary — plain-text quantity/unit summary (e.g. "2
--                        acre"), built from job_services so the card
--                        doesn't need a second round trip
--   offer_count        — total offers so far (any provider) — never
--                        exposes who, just a count, so a provider can
--                        gauge how much competition there is

-- Adding parameters changes the function's signature, so CREATE OR
-- REPLACE alone would overload rather than replace it, leaving the old
-- 2-arg version callable too and making `rpc("discover_jobs", {...})`
-- ambiguous for callers passing only the original two named arguments.
-- Drop the old signature explicitly first.
drop function if exists public.discover_jobs(uuid, numeric);

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
  offer_count integer
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  with me as (
    select id as provider_id, location as provider_location
    from public.provider_profiles
    where profile_id = (select auth.uid())
  )
  select
    fj.id, fj.title, fj.description, fj.status,
    fj.scheduled_start, fj.scheduled_end,
    fj.budget_min, fj.budget_max, fj.budget_type,
    fj.created_at, fj.updated_at,
    p.location,
    case when me.provider_location is not null and fj.location is not null
      then round((ST_Distance(me.provider_location, fj.location) / 1000)::numeric, 1)
      else null end,
    (
      select array_agg(distinct s.name order by s.name)
      from public.job_services js join public.services s on s.id = js.service_id
      where js.job_id = fj.id
    ),
    exists (
      select 1 from public.job_services js
      join public.provider_services ps on ps.service_id = js.service_id and ps.is_active
      where js.job_id = fj.id and ps.provider_id = me.provider_id
    ),
    (
      select jo2.status from public.job_offers jo2
      where jo2.job_id = fj.id and jo2.provider_id = me.provider_id
      order by jo2.created_at desc
      limit 1
    ),
    (
      select string_agg(trim(concat_ws(' ', js.quantity::text, js.unit)), ', ')
      from public.job_services js
      where js.job_id = fj.id and js.quantity is not null
    ),
    (
      select count(*)::int from public.job_offers jo3 where jo3.job_id = fj.id
    )
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
  order by
    case when p_sort = 'nearest' then
      (case when me.provider_location is not null and fj.location is not null
        then ST_Distance(me.provider_location, fj.location) else null end)
    end asc nulls last,
    case when p_sort = 'newest' then fj.created_at end desc,
    case when p_sort = 'budget' then coalesce(fj.budget_max, fj.budget_min) end desc nulls last,
    case when p_sort = 'earliest' then fj.scheduled_start end asc nulls last,
    -- 'recommended' (the default) and the final tiebreak for every other
    -- mode: matching service first, then nearest, then soonest, then
    -- newest. Plain deterministic ranking — no matching algorithm.
    exists (
      select 1 from public.job_services js
      join public.provider_services ps on ps.service_id = js.service_id and ps.is_active
      where js.job_id = fj.id and ps.provider_id = me.provider_id
    ) desc,
    (case when me.provider_location is not null and fj.location is not null
      then ST_Distance(me.provider_location, fj.location) else null end) asc nulls last,
    fj.scheduled_start asc nulls last,
    fj.created_at desc;
$$;

revoke execute on function public.discover_jobs(uuid, numeric, uuid, timestamptz, timestamptz, numeric, numeric, text) from public, anon;
grant execute on function public.discover_jobs(uuid, numeric, uuid, timestamptz, timestamptz, numeric, numeric, text) to authenticated;
