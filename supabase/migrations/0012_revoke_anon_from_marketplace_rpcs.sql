-- Supabase grants EXECUTE on new public-schema functions to `anon` and
-- `authenticated` by default (a project-level default privilege, not
-- something `revoke ... from public` alone undoes) — so discover_jobs,
-- get_offers_for_job, and get_my_offers ended up callable by anon despite
-- 0011's `revoke ... from public`. They're each safe for anon in practice
-- (empty result or an exception, never real data), but there's no product
-- reason for anon to call them, so tighten anyway.
--
-- The four boolean predicate functions (owns_provider_profile,
-- owns_farm_job, is_assigned_provider_for_job, can_view_job_requirements)
-- are deliberately left anon-executable, unchanged — established pattern
-- from 0004/0007/0011.

revoke execute on function public.discover_jobs(uuid, numeric) from anon;
revoke execute on function public.get_offers_for_job(uuid) from anon;
revoke execute on function public.get_my_offers() from anon;
