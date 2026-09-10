-- Harden Phase 2 profile functions per Supabase security advisor findings.

-- Explicit search_path prevents search_path hijacking (advisor:
-- function_search_path_mutable).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is a trigger function (invoked only by the
-- on_auth_user_created trigger). Without this, it's directly callable by
-- anonymous and authenticated users via PostgREST's auto-exposed RPC
-- endpoint (POST /rest/v1/rpc/handle_new_user) since it's a public-schema
-- SECURITY DEFINER function. Revoking EXECUTE from those roles does not
-- affect the trigger's ability to fire (trigger invocation isn't gated by
-- the function's EXECUTE grant).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
