-- Bug found during Phase 3C end-to-end testing: accept_job_offer was
-- SECURITY INVOKER, so its call to create_notification() ran as the
-- calling farmer -- who has no EXECUTE grant on that function (by
-- design, per 0017). Every accept attempt failed with "permission
-- denied for function create_notification" and rolled back.
--
-- Fix: make accept_job_offer SECURITY DEFINER, like submit_job_offer,
-- so its internal call to create_notification runs as the function
-- owner. Since SECURITY DEFINER bypasses the job_assignments
-- "insertable by job owner" RLS policy that previously provided the
-- only authorization check, add an explicit ownership check up front.

create or replace function public.accept_job_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_provider_id uuid;
  v_assignment_id uuid;
  v_provider_profile_id uuid;
  v_job_title text;
begin
  select job_id, provider_id into v_job_id, v_provider_id
  from public.job_offers where id = p_offer_id;

  if v_job_id is null then
    raise exception 'offer not found';
  end if;

  if not exists (
    select 1 from public.farm_jobs where id = v_job_id and created_by = (select auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.job_assignments (job_id, provider_id, offer_id)
  values (v_job_id, v_provider_id, p_offer_id)
  returning id into v_assignment_id;

  update public.farm_jobs set status = 'confirmed' where id = v_job_id;

  select profile_id into v_provider_profile_id from public.provider_profiles where id = v_provider_id;
  select title into v_job_title from public.farm_jobs where id = v_job_id;

  perform public.create_notification(
    v_provider_profile_id,
    'offer_accepted',
    'Your offer was accepted',
    format('You are confirmed for "%s". The exact location and contact details are now available.', coalesce(v_job_title, 'a job')),
    'job',
    v_job_id
  );

  return v_assignment_id;
end;
$$;

revoke execute on function public.accept_job_offer(uuid) from public, anon;
grant execute on function public.accept_job_offer(uuid) to authenticated;
