-- sync_offer_status_on_assignment (0007) is a trigger-only function — it
-- should never be called directly via PostgREST's auto-exposed RPC
-- endpoint. Its RETURNS trigger signature already makes a direct call
-- fail at execution time, but explicitly revoking EXECUTE closes the
-- advisor finding and matches the same hardening already applied to
-- handle_new_user in 0002.
--
-- owns_provider_profile and owns_farm_job are deliberately left granted to
-- `authenticated` (not touched here) — they're helper predicates used
-- inside other tables' RLS policies, which requires the querying role to
-- have EXECUTE on them. Calling either directly via RPC with an id that
-- isn't yours just returns false; it exposes nothing.

revoke execute on function public.sync_offer_status_on_assignment() from public, anon, authenticated;
