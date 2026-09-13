-- Phase 7: deterministic, explainable matching helper functions.
-- Each computes ONE named, independently-testable fact about a
-- provider/job pair. None are meant to be called directly via
-- PostgREST -- they are internal building blocks for discover_jobs()
-- and get_offers_for_job(), which already run as the querying user's
-- own data (self-check) or an already-authorized job owner. EXECUTE is
-- revoked from anon/authenticated below, same lockdown pattern as the
-- Phase 5 trigger functions.

-- Fraction of a job's required services (job_services) the provider
-- actively offers. Jobs today always have exactly one row here, but
-- the schema allows more, so this returns a ratio rather than a bare
-- boolean. Null if the job somehow has no service rows at all.
create or replace function public.provider_service_match_ratio(p_provider_id uuid, p_job_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when count(*) = 0 then null
    else count(*) filter (
      where exists (
        select 1 from public.provider_services ps
        where ps.provider_id = p_provider_id and ps.service_id = js.service_id and ps.is_active
      )
    )::numeric / count(*)
  end
  from public.job_services js
  where js.job_id = p_job_id;
$$;

revoke execute on function public.provider_service_match_ratio(uuid, uuid) from public, anon, authenticated;

-- Does the job's scheduled start fall inside one of the provider's
-- recurring weekly availability windows (provider_availability)?
-- Returns null (unknown, never "unavailable") when the job has no
-- schedule or the provider has not set any availability at all -- an
-- unfilled section must never read as a negative signal.
-- Known limitation: compares local time-of-day only, so a job whose
-- window crosses midnight is not evaluated correctly -- documented in
-- ARCHITECTURE.md rather than solved here.
create or replace function public.provider_available_for_schedule(
  p_provider_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has_any boolean;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  if p_scheduled_start is null then
    return null;
  end if;

  select exists (
    select 1 from public.provider_availability where provider_id = p_provider_id
  ) into v_has_any;

  if not v_has_any then
    return null;
  end if;

  v_local_start := p_scheduled_start at time zone 'Asia/Kolkata';
  v_local_end := coalesce(p_scheduled_end, p_scheduled_start) at time zone 'Asia/Kolkata';

  return exists (
    select 1 from public.provider_availability pa
    where pa.provider_id = p_provider_id
      and pa.is_available
      and pa.day_of_week = extract(dow from v_local_start)::smallint
      and pa.start_time <= v_local_start::time
      and pa.end_time >= v_local_end::time
  );
end;
$$;

revoke execute on function public.provider_available_for_schedule(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- Does the provider already have a confirmed/in-progress job whose
-- scheduled window overlaps this one? Only ever asserts a conflict
-- when BOTH jobs have explicit start/end times -- otherwise there is
-- no way to prove an overlap, so it reports no conflict rather than
-- guessing.
create or replace function public.provider_has_workload_conflict(
  p_provider_id uuid,
  p_job_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_assignments ja
    join public.farm_jobs fj on fj.id = ja.job_id
    where ja.provider_id = p_provider_id
      and ja.status in ('assigned', 'confirmed')
      and fj.status in ('confirmed', 'in_progress')
      and fj.id <> p_job_id
      and fj.scheduled_start is not null
      and fj.scheduled_end is not null
      and p_scheduled_start is not null
      and p_scheduled_end is not null
      and tstzrange(fj.scheduled_start, fj.scheduled_end) && tstzrange(p_scheduled_start, p_scheduled_end)
  );
$$;

revoke execute on function public.provider_has_workload_conflict(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- Null (not applicable) when the job has no machine requirement at
-- all. Otherwise true only if EVERY job_machine_requirements row has
-- at least one matching active machine -- matched either by a
-- normalized (lowercased/trimmed) machine_type comparison, or because
-- the machine is linked (machine_services) to the job's required
-- service. Both machine_type fields are free text with no shared
-- vocabulary, so the text match is a pragmatic approximation, not a
-- guarantee -- documented as a known limitation.
create or replace function public.provider_has_matching_machine(p_provider_id uuid, p_job_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_needs boolean;
begin
  select exists (
    select 1 from public.job_machine_requirements where job_id = p_job_id
  ) into v_needs;

  if not v_needs then
    return null;
  end if;

  return not exists (
    select 1 from public.job_machine_requirements jmr
    where jmr.job_id = p_job_id
      and not exists (
        select 1 from public.machines m
        where m.provider_id = p_provider_id
          and m.is_active
          and (
            lower(trim(m.machine_type)) = lower(trim(jmr.machine_type))
            or exists (
              select 1 from public.machine_services ms
              join public.job_services js on js.service_id = ms.service_id
              where ms.machine_id = m.id and js.job_id = p_job_id
            )
          )
      )
  );
end;
$$;

revoke execute on function public.provider_has_matching_machine(uuid, uuid) from public, anon, authenticated;

-- Null (not applicable) when the job has no worker requirement.
-- Otherwise true only if EVERY job_worker_requirements row is covered
-- by either the provider's active individual workers or some single
-- active team with enough members -- a pure capacity check, no
-- skill-matching (job_worker_requirements.skill_requirement is free
-- text with no reliable structure to match against).
create or replace function public.provider_has_matching_workers(p_provider_id uuid, p_job_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_needs boolean;
begin
  select exists (
    select 1 from public.job_worker_requirements where job_id = p_job_id
  ) into v_needs;

  if not v_needs then
    return null;
  end if;

  return not exists (
    select 1 from public.job_worker_requirements jwr
    where jwr.job_id = p_job_id
      and jwr.worker_count > coalesce(
        (select count(*) from public.workers w where w.provider_id = p_provider_id and w.is_active), 0
      )
      and jwr.worker_count > coalesce(
        (select max(t.member_count) from public.teams t where t.provider_id = p_provider_id and t.is_active), 0
      )
  );
end;
$$;

revoke execute on function public.provider_has_matching_workers(uuid, uuid) from public, anon, authenticated;

-- Null (unknown) unless the job has a stated budget AND the provider
-- has a stated price range for the job's required service
-- (provider_services.min_price/max_price). Otherwise a plain range
-- overlap test -- never a guarantee of final price, offers are still
-- negotiated.
create or replace function public.provider_budget_fit(p_provider_id uuid, p_job_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_budget_min numeric;
  v_budget_max numeric;
  v_price_min numeric;
  v_price_max numeric;
begin
  select budget_min, budget_max into v_budget_min, v_budget_max
  from public.farm_jobs where id = p_job_id;

  if v_budget_min is null and v_budget_max is null then
    return null;
  end if;

  select ps.min_price, ps.max_price into v_price_min, v_price_max
  from public.job_services js
  join public.provider_services ps
    on ps.service_id = js.service_id and ps.provider_id = p_provider_id and ps.is_active
  where js.job_id = p_job_id
  limit 1;

  if not found or (v_price_min is null and v_price_max is null) then
    return null;
  end if;

  return (v_budget_max is null or v_price_min is null or v_price_min <= v_budget_max)
     and (v_budget_min is null or v_price_max is null or v_price_max >= v_budget_min);
end;
$$;

revoke execute on function public.provider_budget_fit(uuid, uuid) from public, anon, authenticated;

-- Bayesian-damped reputation, 0-5 scale: a provider with zero reviews
-- lands at the neutral prior (3.5), never at zero, so a new provider
-- is never mathematically buried by this term. Small prior weight (3)
-- means a handful of real reviews quickly dominates the prior.
create or replace function public.provider_trust_score(p_rating_average numeric, p_rating_count integer)
returns numeric
language sql
immutable
as $$
  select case
    when p_rating_count is null or p_rating_count <= 0 or p_rating_average is null then 3.5
    else (p_rating_average * p_rating_count + 3.5 * 3) / (p_rating_count + 3)
  end;
$$;

revoke execute on function public.provider_trust_score(numeric, integer) from public, anon, authenticated;

-- Combines the independent facts above into one of 'strong' / 'good' /
-- 'fair' / null (no real match) -- a simple, documented rule, not a
-- weighted score: null inputs (unknown/not-applicable) are never
-- counted as negative, only an explicit false counts against a
-- candidate.
create or replace function public.job_match_tier(
  p_service_ratio numeric,
  p_within_radius boolean,
  p_schedule_available boolean,
  p_has_workload_conflict boolean,
  p_machine_match boolean,
  p_worker_match boolean,
  p_budget_fit boolean
) returns text
language sql
immutable
as $$
  select case
    when p_service_ratio is null or p_service_ratio <= 0 then null
    else (
      select case
        when count(*) filter (where v = false) = 0 then 'strong'
        when count(*) filter (where v = false) <= 1 then 'good'
        else 'fair'
      end
      from unnest(array[
        p_within_radius,
        p_schedule_available,
        case when p_has_workload_conflict is null then null else not p_has_workload_conflict end,
        p_machine_match,
        p_worker_match,
        p_budget_fit
      ]) as v
    )
  end;
$$;

revoke execute on function public.job_match_tier(numeric, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon, authenticated;
