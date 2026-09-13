-- Fixes a real, pre-existing gap found while building Phase 7's hard-
-- eligibility rules: submit_job_offer() never checked
-- provider_profiles.is_active, so a deactivated provider (meant to be
-- invisible to farmers -- see provider_profiles_active_idx and its
-- use across discovery) could still submit a new offer. Signature and
-- every other behavior are unchanged.
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
  v_farmer_id uuid;
  v_job_title text;
  v_business_name text;
begin
  if not public.owns_provider_profile(p_provider_id) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.provider_profiles where id = p_provider_id and is_active
  ) then
    raise exception 'provider profile is not active';
  end if;

  insert into public.job_offers (job_id, provider_id, price, message, estimated_start, estimated_duration)
  values (p_job_id, p_provider_id, p_price, p_message, p_estimated_start, p_estimated_duration)
  returning id into v_offer_id;

  update public.farm_jobs
  set status = 'offers_received'
  where id = p_job_id and status = 'posted';

  select created_by, title into v_farmer_id, v_job_title from public.farm_jobs where id = p_job_id;
  select business_name into v_business_name from public.provider_profiles where id = p_provider_id;

  perform public.create_notification(
    v_farmer_id,
    'offer_received',
    'New offer received',
    format(
      '%s submitted an offer%s for %s.',
      coalesce(v_business_name, 'A provider'),
      case when p_price is not null then format(' of Rs %s', trim(to_char(p_price, '999,999,999'))) else '' end,
      coalesce(v_job_title, 'your job')
    ),
    'job',
    p_job_id
  );

  return v_offer_id;
end;
$$;
