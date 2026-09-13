-- Security advisor flagged both new pure-math functions for a missing
-- search_path -- neither touches a table, but every function in this
-- codebase sets search_path explicitly as a matter of discipline.
create or replace function public.provider_trust_score(p_rating_average numeric, p_rating_count integer)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_rating_count is null or p_rating_count <= 0 or p_rating_average is null then 3.5
    else (p_rating_average * p_rating_count + 3.5 * 3) / (p_rating_count + 3)
  end;
$$;

create or replace function public.job_match_tier(
  p_service_ratio numeric,
  p_within_radius boolean,
  p_schedule_available boolean,
  p_has_workload_conflict boolean,
  p_machine_match boolean,
  p_worker_match boolean,
  p_budget_fit boolean
) returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_service_ratio is null or p_service_ratio <= 0 then null
    else (
      select case
        when count(*) filter (where v = false) = 0 then 'strong'
        when count(*) filter (where v = false) <= 1 then 'good'
        else 'fair'
      end
      from unnest(array[
        p_within_radius,
        p_schedule_available,
        case when p_has_workload_conflict is null then null else not p_has_workload_conflict end,
        p_machine_match,
        p_worker_match,
        p_budget_fit
      ]) as v
    )
  end;
$$;
