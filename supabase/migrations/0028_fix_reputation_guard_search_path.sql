-- Security advisor flagged function_search_path_mutable against
-- protect_provider_reputation_columns (0027) -- it was the only function
-- added this phase missing `set search_path = public`. Fixed by
-- recreating it identically with that clause added.
create or replace function public.protect_provider_reputation_columns()
returns trigger
language plpgsql
set search_path = public
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
