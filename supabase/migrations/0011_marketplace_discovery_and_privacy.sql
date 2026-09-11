-- Phase 3B: RLS/RPC additions needed for the marketplace UI.
--
-- The core privacy problem: providers need to browse open jobs and see
-- job requirements, but farm_jobs.location must never reach a provider
-- who isn't assigned to that job. A row-level RLS policy can't express
-- "let them see this row but hide one column" — so instead of adding a
-- broad "providers can select posted jobs" policy on farm_jobs (which
-- would let a client `select('location')` directly), provider-side
-- browsing goes through SECURITY DEFINER functions that explicitly
-- choose which columns to return and never include raw geography.
--
-- Post-assignment, an assigned provider DOES get real, direct RLS access
-- to the full farm_jobs row (including location) and the farmer's
-- profile (including phone) — that's a deliberate, narrow RLS addition,
-- not a function, because at that point full access is exactly correct
-- and auditable as a normal policy.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_assigned_provider_for_job(p_job_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.job_assignments ja
    where ja.job_id = p_job_id
      and ja.status in ('assigned', 'confirmed')
      and public.owns_provider_profile(ja.provider_id)
  );
$$;

revoke execute on function public.is_assigned_provider_for_job(uuid) from public;
grant execute on function public.is_assigned_provider_for_job(uuid) to authenticated, anon;

-- Can the current user see a job's requirement rows (job_services etc.)?
-- Either it's an open marketplace job and they're a registered provider,
-- or they're the provider actually assigned to it (job owner access is
-- covered separately by the existing owns_farm_job policy from 0007).
create or replace function public.can_view_job_requirements(p_job_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    (
      exists (
        select 1 from public.farm_jobs fj
        where fj.id = p_job_id
          and fj.status in ('posted', 'matching', 'offers_received')
      )
      and exists (select 1 from public.provider_profiles where profile_id = (select auth.uid()))
    )
    or public.is_assigned_provider_for_job(p_job_id);
$$;

revoke execute on function public.can_view_job_requirements(uuid) from public;
grant execute on function public.can_view_job_requirements(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS: requirement tables become visible to eligible providers, in
-- addition to the existing job-owner policies from 0007 (permissive
-- policies OR together — this doesn't replace owner access).
-- ---------------------------------------------------------------------------

create policy "Job services are viewable by eligible providers"
  on public.job_services for select
  using (public.can_view_job_requirements(job_id));

create policy "Job machine requirements are viewable by eligible providers"
  on public.job_machine_requirements for select
  using (public.can_view_job_requirements(job_id));

create policy "Job worker requirements are viewable by eligible providers"
  on public.job_worker_requirements for select
  using (public.can_view_job_requirements(job_id));

-- ---------------------------------------------------------------------------
-- RLS: assigned provider gets full farm_jobs row access (incl. location),
-- and the two parties in an active assignment can see each other's
-- profile (incl. phone) — this is the "exact info once confirmed" rule.
-- ---------------------------------------------------------------------------

create policy "Farm jobs are viewable by the assigned provider"
  on public.farm_jobs for select
  using (public.is_assigned_provider_for_job(id));

create policy "Profiles are viewable by the counterparty in an active assignment"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.job_assignments ja
      join public.farm_jobs fj on fj.id = ja.job_id
      join public.provider_profiles pp on pp.id = ja.provider_id
      where ja.status in ('assigned', 'confirmed')
        and (
          (profiles.id = fj.created_by and pp.profile_id = (select auth.uid()))
          or
          (profiles.id = pp.profile_id and fj.created_by = (select auth.uid()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- discover_jobs — the provider job-discovery feed. Never returns
-- farm_jobs.location; "locality" is the farmer's free-text profile
-- location (Phase 2), and distance is computed server-side from both
-- parties' geography points without exposing either. Ordering is plain
-- SQL (matching service first, then distance, then soonest scheduled,
-- then newest) — no matching algorithm.
--
-- p_job_id, when given, narrows to a single job (reused for the job
-- detail page so there's one code path, not two).
-- ---------------------------------------------------------------------------

create or replace function public.discover_jobs(p_job_id uuid default null, p_max_distance_km numeric default null)
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
  locality text,
  distance_km numeric,
  service_names text[],
  has_matching_service boolean
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select
    fj.id, fj.title, fj.description, fj.status,
    fj.scheduled_start, fj.scheduled_end,
    fj.budget_min, fj.budget_max, fj.budget_type,
    fj.created_at,
    p.location,
    case when pp.location is not null and fj.location is not null
      then round((ST_Distance(pp.location, fj.location) / 1000)::numeric, 1)
      else null end,
    (
      select array_agg(distinct s.name order by s.name)
      from public.job_services js join public.services s on s.id = js.service_id
      where js.job_id = fj.id
    ),
    exists (
      select 1 from public.job_services js
      join public.provider_services ps on ps.service_id = js.service_id and ps.is_active
      where js.job_id = fj.id and ps.provider_id = pp.id
    )
  from public.farm_jobs fj
  join public.profiles p on p.id = fj.created_by
  left join public.provider_profiles pp on pp.profile_id = (select auth.uid())
  where exists (select 1 from public.provider_profiles where profile_id = (select auth.uid()))
    and fj.status in ('posted', 'matching', 'offers_received')
    and (p_job_id is null or fj.id = p_job_id)
    and (
      p_max_distance_km is null or pp.location is null or fj.location is null
      or ST_DWithin(pp.location, fj.location, p_max_distance_km * 1000)
    )
  order by
    exists (
      select 1 from public.job_services js
      join public.provider_services ps on ps.service_id = js.service_id and ps.is_active
      where js.job_id = fj.id and ps.provider_id = pp.id
    ) desc,
    (case when pp.location is not null and fj.location is not null
      then ST_Distance(pp.location, fj.location) else null end) asc nulls last,
    fj.scheduled_start asc nulls last,
    fj.created_at desc;
$$;

revoke execute on function public.discover_jobs(uuid, numeric) from public;
grant execute on function public.discover_jobs(uuid, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- get_offers_for_job — job-owner-only. Returns offers with safe provider
-- fields and a computed distance, never a raw provider coordinate.
-- ---------------------------------------------------------------------------

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
  distance_km numeric,
  price numeric,
  message text,
  estimated_start timestamptz,
  estimated_duration interval,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
begin
  if not public.owns_farm_job(p_job_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    jo.id, jo.provider_id, pp.business_name, pp.description, pp.verification_status,
    pp.rating_average, pp.rating_count, pp.completed_jobs_count,
    case when pp.location is not null and fj.location is not null
      then round((ST_Distance(pp.location, fj.location) / 1000)::numeric, 1)
      else null end,
    jo.price, jo.message, jo.estimated_start, jo.estimated_duration, jo.status, jo.created_at
  from public.job_offers jo
  join public.provider_profiles pp on pp.id = jo.provider_id
  join public.farm_jobs fj on fj.id = jo.job_id
  where jo.job_id = p_job_id
  order by jo.created_at desc;
end;
$$;

revoke execute on function public.get_offers_for_job(uuid) from public;
grant execute on function public.get_offers_for_job(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_offers — the calling provider's own offers, joined with just
-- enough job context (title/status/locality/schedule/budget) to display
-- a "My Offers" list without needing direct farm_jobs read access.
-- ---------------------------------------------------------------------------

create or replace function public.get_my_offers()
returns table (
  offer_id uuid,
  job_id uuid,
  job_title text,
  job_status text,
  job_locality text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  budget_min numeric,
  budget_max numeric,
  budget_type text,
  price numeric,
  message text,
  estimated_start timestamptz,
  estimated_duration interval,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    jo.id, fj.id, fj.title, fj.status, p.location,
    fj.scheduled_start, fj.scheduled_end, fj.budget_min, fj.budget_max, fj.budget_type,
    jo.price, jo.message, jo.estimated_start, jo.estimated_duration, jo.status, jo.created_at
  from public.job_offers jo
  join public.farm_jobs fj on fj.id = jo.job_id
  join public.profiles p on p.id = fj.created_by
  where jo.provider_id in (select id from public.provider_profiles where profile_id = (select auth.uid()))
  order by jo.created_at desc;
$$;

revoke execute on function public.get_my_offers() from public;
grant execute on function public.get_my_offers() to authenticated;
