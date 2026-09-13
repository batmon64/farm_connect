-- Phase 3D: the offer-comparison screen wants to show what a provider
-- actually offers (e.g. "Grass Cutting, Tractor Services") alongside
-- their rating/verification, matching the trust-signal presentation
-- used elsewhere. get_offers_for_job already exposes rating/verification
-- fields from provider_profiles; this just adds their active service
-- names, pulled the same way discover_jobs already aggregates them.

-- Changing a RETURNS TABLE shape (adding a column) isn't allowed via
-- CREATE OR REPLACE — Postgres requires the old function dropped first.
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
    (
      select array_agg(distinct s.name order by s.name)
      from public.provider_services ps
      join public.services s on s.id = ps.service_id
      where ps.provider_id = pp.id and ps.is_active
    ),
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

revoke execute on function public.get_offers_for_job(uuid) from public, anon;
grant execute on function public.get_offers_for_job(uuid) to authenticated;
