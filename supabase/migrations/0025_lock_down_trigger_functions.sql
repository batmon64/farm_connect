-- Security advisor caught this immediately after 0024: PostgREST exposes
-- any public-schema function as a callable RPC regardless of whether it
-- was written to be one. Both new trigger functions
-- (update_provider_rating_aggregate, increment_provider_completed_jobs)
-- reference NEW/OLD, which only exist inside an actual trigger firing —
-- a direct RPC call would just error — but they had no business being
-- publicly listed at all. Revoking EXECUTE does not affect their
-- ability to fire as triggers: trigger invocation is not subject to the
-- same EXECUTE-grant check as an explicit SQL/RPC call.

revoke execute on function public.update_provider_rating_aggregate() from public, anon, authenticated;
revoke execute on function public.increment_provider_completed_jobs() from public, anon, authenticated;
