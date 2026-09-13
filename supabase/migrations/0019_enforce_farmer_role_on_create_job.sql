-- Bug found during Phase 3C end-to-end testing: /app/jobs/new had no
-- role guard (unlike /app/provider/**, which redirects non-providers),
-- and create_farm_job never checked profiles.is_farmer either -- so a
-- provider-only account could post a farm job by hitting the route
-- directly. RLS still scoped the resulting data correctly (nothing was
-- exposed to the wrong party), but a provider appearing as a job's
-- farmer is a real data-integrity problem, not just a UX gap. Fixed the
-- route in the app layer; this adds the matching server-side check,
-- consistent with submit_job_offer/accept_job_offer re-checking
-- authorization inside the function body rather than trusting the UI.

create or replace function public.create_farm_job(
  p_service_id uuid,
  p_title text,
  p_description text,
  p_quantity numeric,
  p_unit text,
  p_notes text,
  p_needs_workers boolean,
  p_worker_count integer,
  p_skill_requirement text,
  p_needs_machine boolean,
  p_machine_type text,
  p_machine_quantity integer,
  p_operator_required boolean,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_longitude double precision,
  p_latitude double precision,
  p_budget_min numeric,
  p_budget_max numeric,
  p_budget_type text
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_job_id uuid;
  v_location extensions.geography;
begin
  if not exists (
    select 1 from public.profiles where id = (select auth.uid()) and is_farmer
  ) then
    raise exception 'not authorized';
  end if;

  if p_longitude is not null and p_latitude is not null then
    v_location := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography;
  end if;

  insert into public.farm_jobs (
    created_by, title, description, status, location,
    scheduled_start, scheduled_end, budget_min, budget_max, budget_type
  ) values (
    (select auth.uid()), p_title, p_description, 'posted', v_location,
    p_scheduled_start, p_scheduled_end, p_budget_min, p_budget_max, p_budget_type
  )
  returning id into v_job_id;

  insert into public.job_services (job_id, service_id, quantity, unit, notes)
  values (v_job_id, p_service_id, p_quantity, p_unit, p_notes);

  if p_needs_workers and p_worker_count is not null then
    insert into public.job_worker_requirements (job_id, worker_count, skill_requirement)
    values (v_job_id, p_worker_count, p_skill_requirement);
  end if;

  if p_needs_machine and p_machine_type is not null then
    insert into public.job_machine_requirements (job_id, machine_type, quantity, operator_required)
    values (v_job_id, p_machine_type, coalesce(p_machine_quantity, 1), coalesce(p_operator_required, true));
  end if;

  return v_job_id;
end;
$$;

revoke execute on function public.create_farm_job(
  uuid, text, text, numeric, text, text, boolean, integer, text,
  boolean, text, integer, boolean, timestamptz, timestamptz,
  double precision, double precision, numeric, numeric, text
) from public, anon;
grant execute on function public.create_farm_job(
  uuid, text, text, numeric, text, text, boolean, integer, text,
  boolean, text, integer, boolean, timestamptz, timestamptz,
  double precision, double precision, numeric, numeric, text
) to authenticated;
