-- PostgREST returns geography columns as WKB hex, not GeoJSON, so the
-- client can't just parse farm_jobs.location directly. This extracts
-- plain lng/lat for display (e.g. a "view on map" link on the provider's
-- Work page, once they're assigned). SECURITY INVOKER — it can only ever
-- return coordinates for a job the caller can already SELECT via
-- farm_jobs' own RLS (owner, or the assigned provider from 0011), so it
-- grants no access beyond what the caller already has.

create or replace function public.get_job_coordinates(p_job_id uuid)
returns table (longitude double precision, latitude double precision)
language sql
security invoker
set search_path = public, extensions
stable
as $$
  select ST_X(location::extensions.geometry), ST_Y(location::extensions.geometry)
  from public.farm_jobs
  where id = p_job_id and location is not null;
$$;

revoke execute on function public.get_job_coordinates(uuid) from public, anon;
grant execute on function public.get_job_coordinates(uuid) to authenticated;
