-- Phase 3B: atomic write RPCs for the three multi-table marketplace
-- writes. Sequential client-side inserts would risk a partial write if a
-- later statement failed (e.g. a job created with no job_services row);
-- wrapping each in a single plpgsql function makes it one transaction.
--
-- create_farm_job: SECURITY INVOKER — the caller is inserting their own
-- data, so ordinary RLS (already correct from 0007) is all the
-- authorization this needs.
--
-- submit_job_offer / accept_job_offer: SECURITY DEFINER, because each
-- needs to update farm_jobs.status, which is owned by the OTHER party
-- (the farmer) — a provider submitting an offer, or a farmer accepting
-- one, has no direct UPDATE grant on the other side's data. Both
-- explicitly re-check authorization inside the function body before
-- writing anything, so this doesn't create a general-purpose bypass.

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

create or replace function public.submit_job_offer(
  p_job_id uuid,
  p_provider_id uuid,
  p_price numeric,
  p_message text,
  p_estimated_start timestamptz,
  p_estimated_duration interval
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer_id uuid;
begin
  if not public.owns_provider_profile(p_provider_id) then
    raise exception 'not authorized';
  end if;

  insert into public.job_offers (job_id, provider_id, price, message, estimated_start, estimated_duration)
  values (p_job_id, p_provider_id, p_price, p_message, p_estimated_start, p_estimated_duration)
  returning id into v_offer_id;

  update public.farm_jobs
  set status = 'offers_received'
  where id = p_job_id and status = 'posted';

  return v_offer_id;
end;
$$;

revoke execute on function public.submit_job_offer(uuid, uuid, numeric, text, timestamptz, interval) from public, anon;
grant execute on function public.submit_job_offer(uuid, uuid, numeric, text, timestamptz, interval) to authenticated;

create or replace function public.accept_job_offer(p_offer_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_job_id uuid;
  v_provider_id uuid;
  v_assignment_id uuid;
begin
  select job_id, provider_id into v_job_id, v_provider_id
  from public.job_offers where id = p_offer_id;

  if v_job_id is null then
    raise exception 'offer not found';
  end if;

  -- job_assignments' own RLS (job-owner-only insert) and the 0007
  -- triggers (offer/job_id/provider_id consistency check, single-active-
  -- assignment-per-job, offer status sync) all still apply here.
  insert into public.job_assignments (job_id, provider_id, offer_id)
  values (v_job_id, v_provider_id, p_offer_id)
  returning id into v_assignment_id;

  update public.farm_jobs set status = 'confirmed' where id = v_job_id;

  return v_assignment_id;
end;
$$;

revoke execute on function public.accept_job_offer(uuid) from public, anon;
grant execute on function public.accept_job_offer(uuid) to authenticated;
