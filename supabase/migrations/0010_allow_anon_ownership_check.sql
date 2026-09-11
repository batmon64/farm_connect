-- Tables whose RLS policies call owns_provider_profile()/owns_farm_job()
-- (machines, farm job requirements, offers, assignments, ...) were
-- returning a hard 401 "permission denied for function" to anonymous
-- requests, instead of a clean filtered empty result like
-- provider_profiles/farm_jobs (whose policies compare auth.uid() inline,
-- not via these helpers) — because anon had no EXECUTE grant on either
-- function.
--
-- Both outcomes are equally secure: anon never sees a row either way,
-- since auth.uid() is null for anon and the functions' underlying query
-- can never match a null profile_id/created_by. This just makes the
-- anonymous-access behavior consistent (200 + [] everywhere) instead of
-- erroring on some tables and not others.

grant execute on function public.owns_provider_profile(uuid) to anon;
grant execute on function public.owns_farm_job(uuid) to anon;
