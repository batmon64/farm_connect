-- 0011 added a second permissive SELECT policy alongside each table's
-- existing owner policy, so Postgres evaluates two separate policy
-- predicates per query instead of one. Combine each pair into a single
-- policy with an OR'd condition — same access, one predicate.

drop policy "Farm jobs are viewable by owner" on public.farm_jobs;
drop policy "Farm jobs are viewable by the assigned provider" on public.farm_jobs;
create policy "Farm jobs are viewable by owner or assigned provider"
  on public.farm_jobs for select
  using (
    (select auth.uid()) = created_by
    or public.is_assigned_provider_for_job(id)
  );

drop policy "Profiles are viewable by owner" on public.profiles;
drop policy "Profiles are viewable by the counterparty in an active assignment" on public.profiles;
create policy "Profiles are viewable by owner or assignment counterparty"
  on public.profiles for select
  using (
    (select auth.uid()) = id
    or exists (
      select 1
      from public.job_assignments ja
      join public.farm_jobs fj on fj.id = ja.job_id
      join public.provider_profiles pp on pp.id = ja.provider_id
      where ja.status in ('assigned', 'confirmed')
        and (
          (profiles.id = fj.created_by and pp.profile_id = (select auth.uid()))
          or
          (profiles.id = pp.profile_id and fj.created_by = (select auth.uid()))
        )
    )
  );

drop policy "Job services are viewable by job owner" on public.job_services;
drop policy "Job services are viewable by eligible providers" on public.job_services;
create policy "Job services are viewable by job owner or eligible provider"
  on public.job_services for select
  using (public.owns_farm_job(job_id) or public.can_view_job_requirements(job_id));

drop policy "Job machine requirements are viewable by job owner" on public.job_machine_requirements;
drop policy "Job machine requirements are viewable by eligible providers" on public.job_machine_requirements;
create policy "Job machine requirements are viewable by job owner or eligible provider"
  on public.job_machine_requirements for select
  using (public.owns_farm_job(job_id) or public.can_view_job_requirements(job_id));

drop policy "Job worker requirements are viewable by job owner" on public.job_worker_requirements;
drop policy "Job worker requirements are viewable by eligible providers" on public.job_worker_requirements;
create policy "Job worker requirements are viewable by job owner or eligible provider"
  on public.job_worker_requirements for select
  using (public.owns_farm_job(job_id) or public.can_view_job_requirements(job_id));
