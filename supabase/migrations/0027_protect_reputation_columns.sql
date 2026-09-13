-- Security regression testing found a real gap: "Provider profiles are
-- updatable by owner" (0004) has no column restriction, so a provider
-- could directly PATCH their own rating_average/rating_count/
-- completed_jobs_count via a plain REST call, bypassing the
-- trigger-computed aggregates entirely (Part Q/X's core anti-gaming
-- concern).
--
-- Fix: a BEFORE UPDATE trigger resets these three columns to their old
-- values whenever the update is not itself happening from inside
-- another trigger. pg_trigger_depth() is 1 for a direct client UPDATE
-- (we're already inside this very trigger's own execution), and 2+
-- when the UPDATE was issued by update_provider_rating_aggregate or
-- increment_provider_completed_jobs, which run as part of the reviews/
-- farm_jobs AFTER triggers — i.e. only a genuine server-computed
-- cascade can change these columns, never a top-level client statement.
create or replace function public.protect_provider_reputation_columns()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() <= 1 then
    new.rating_average := old.rating_average;
    new.rating_count := old.rating_count;
    new.completed_jobs_count := old.completed_jobs_count;
  end if;
  return new;
end;
$$;

create trigger provider_profiles_protect_reputation
  before update on public.provider_profiles
  for each row execute function public.protect_provider_reputation_columns();
