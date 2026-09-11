-- Phase 3A (4/4): farm jobs, their requirements, offers, and assignments.
--
-- Scope: farm_jobs, job_services, job_machine_requirements,
-- job_worker_requirements, job_offers, job_assignments.
--
-- Key product rule encoded here: an offer is NOT a reservation. Submitting
-- an offer never touches machine_availability or locks a provider/worker —
-- only a confirmed job_assignment represents real commitment.

-- ---------------------------------------------------------------------------
-- farm_jobs — the central marketplace entity.
-- ---------------------------------------------------------------------------
-- created_by -> profiles, deliberately ON DELETE RESTRICT: a job (and the
-- offers/assignments hanging off it) is shared history between a farmer and
-- provider(s), not data owned by one party alone. It must not silently
-- disappear if a profile is deleted — account-deletion flows that need to
-- handle this are a future, dedicated design, not an FK cascade.
--
-- No automatic status transitions in this phase — the app sets `status`
-- explicitly; the column just constrains it to a known set of values.

create table public.farm_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in (
      'draft', 'posted', 'matching', 'offers_received', 'provider_selected',
      'confirmed', 'in_progress', 'completed', 'cancelled'
    )),
  location extensions.geography(Point, 4326),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  budget_min numeric check (budget_min is null or budget_min >= 0),
  budget_max numeric check (budget_max is null or budget_max >= 0),
  budget_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farm_jobs_budget_range check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  ),
  constraint farm_jobs_schedule_order check (
    scheduled_start is null or scheduled_end is null or scheduled_start < scheduled_end
  )
);

comment on column public.farm_jobs.budget_type is
  'Free-text, e.g. fixed, per_acre, per_hour, per_day, negotiable.';

create trigger farm_jobs_set_updated_at
  before update on public.farm_jobs
  for each row execute function public.set_updated_at();

create index farm_jobs_created_by_idx on public.farm_jobs (created_by);
create index farm_jobs_status_idx on public.farm_jobs (status);
create index farm_jobs_scheduled_start_idx on public.farm_jobs (scheduled_start);
create index farm_jobs_location_idx on public.farm_jobs using gist (location);

alter table public.farm_jobs enable row level security;

-- Reusable RLS predicate, mirroring owns_provider_profile (see 0004) —
-- does the current user own this job?
create or replace function public.owns_farm_job(target_job_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.farm_jobs
    where id = target_job_id
      and created_by = (select auth.uid())
  );
$$;

revoke execute on function public.owns_farm_job(uuid) from public, anon;
grant execute on function public.owns_farm_job(uuid) to authenticated;

-- Owner-only for now. What providers can see in order to make offers
-- (e.g. posted jobs near them) is a matching-phase decision, not this one.
create policy "Farm jobs are viewable by owner"
  on public.farm_jobs for select
  using ((select auth.uid()) = created_by);

create policy "Farm jobs are insertable by owner"
  on public.farm_jobs for insert
  with check ((select auth.uid()) = created_by);

create policy "Farm jobs are updatable by owner"
  on public.farm_jobs for update
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Farm jobs are deletable by owner"
  on public.farm_jobs for delete
  using ((select auth.uid()) = created_by);

-- ---------------------------------------------------------------------------
-- Job requirements — kept separate from farm_jobs so a job can express
-- multiple, independent requirements (services / machines / workers).
-- All cascade with their parent job: they're meaningless without it, and
-- this is distinct from the "protect shared history" concern above, which
-- is specifically about a *profile* deletion not reaching into jobs.
-- ---------------------------------------------------------------------------

create table public.job_services (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.farm_jobs (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  quantity numeric check (quantity is null or quantity > 0),
  unit text,
  notes text,
  created_at timestamptz not null default now()
);

create index job_services_job_id_idx on public.job_services (job_id);
create index job_services_service_id_idx on public.job_services (service_id);

alter table public.job_services enable row level security;

create policy "Job services are viewable by job owner"
  on public.job_services for select
  using (public.owns_farm_job(job_id));

create policy "Job services are insertable by job owner"
  on public.job_services for insert
  with check (public.owns_farm_job(job_id));

create policy "Job services are updatable by job owner"
  on public.job_services for update
  using (public.owns_farm_job(job_id))
  with check (public.owns_farm_job(job_id));

create policy "Job services are deletable by job owner"
  on public.job_services for delete
  using (public.owns_farm_job(job_id));

create table public.job_machine_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.farm_jobs (id) on delete cascade,
  machine_type text not null,
  quantity integer not null default 1 check (quantity > 0),
  operator_required boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index job_machine_requirements_job_id_idx on public.job_machine_requirements (job_id);

alter table public.job_machine_requirements enable row level security;

create policy "Job machine requirements are viewable by job owner"
  on public.job_machine_requirements for select
  using (public.owns_farm_job(job_id));

create policy "Job machine requirements are insertable by job owner"
  on public.job_machine_requirements for insert
  with check (public.owns_farm_job(job_id));

create policy "Job machine requirements are updatable by job owner"
  on public.job_machine_requirements for update
  using (public.owns_farm_job(job_id))
  with check (public.owns_farm_job(job_id));

create policy "Job machine requirements are deletable by job owner"
  on public.job_machine_requirements for delete
  using (public.owns_farm_job(job_id));

create table public.job_worker_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.farm_jobs (id) on delete cascade,
  worker_count integer not null default 1 check (worker_count > 0),
  skill_requirement text,
  notes text,
  created_at timestamptz not null default now()
);

create index job_worker_requirements_job_id_idx on public.job_worker_requirements (job_id);

alter table public.job_worker_requirements enable row level security;

create policy "Job worker requirements are viewable by job owner"
  on public.job_worker_requirements for select
  using (public.owns_farm_job(job_id));

create policy "Job worker requirements are insertable by job owner"
  on public.job_worker_requirements for insert
  with check (public.owns_farm_job(job_id));

create policy "Job worker requirements are updatable by job owner"
  on public.job_worker_requirements for update
  using (public.owns_farm_job(job_id))
  with check (public.owns_farm_job(job_id));

create policy "Job worker requirements are deletable by job owner"
  on public.job_worker_requirements for delete
  using (public.owns_farm_job(job_id));

-- ---------------------------------------------------------------------------
-- job_offers — a provider's response to a job. NOT a reservation.
-- ---------------------------------------------------------------------------
-- provider_id/job_id deliberately RESTRICT on delete (same shared-history
-- reasoning as farm_jobs.created_by): an offer is evidence in both the
-- farmer's and the provider's history.
--
-- A provider may have only one *pending* offer per job at a time (partial
-- unique index below) — they can withdraw and re-offer, but can't stack
-- multiple simultaneous pending offers on the same job.

create table public.job_offers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.farm_jobs (id) on delete restrict,
  provider_id uuid not null references public.provider_profiles (id) on delete restrict,
  price numeric check (price is null or price >= 0),
  message text,
  estimated_start timestamptz,
  estimated_duration interval,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger job_offers_set_updated_at
  before update on public.job_offers
  for each row execute function public.set_updated_at();

create unique index job_offers_one_pending_per_provider_job
  on public.job_offers (job_id, provider_id)
  where status = 'pending';

create index job_offers_job_id_idx on public.job_offers (job_id);
create index job_offers_provider_id_idx on public.job_offers (provider_id);

alter table public.job_offers enable row level security;

-- Both the offering provider and the job owner can see an offer; only the
-- provider can see it if it's not theirs to view as a job owner too.
create policy "Job offers are viewable by provider or job owner"
  on public.job_offers for select
  using (public.owns_provider_profile(provider_id) or public.owns_farm_job(job_id));

create policy "Job offers are insertable by provider"
  on public.job_offers for insert
  with check (public.owns_provider_profile(provider_id));

-- Update is provider-only (e.g. withdrawing an offer). The job owner never
-- writes to job_offers directly — accepting an offer happens by creating a
-- job_assignments row, which flips the offer to 'accepted' via trigger
-- below, keeping "accept" a controlled, single code path rather than an
-- open-ended UPDATE grant on someone else's offer.
create policy "Job offers are updatable by provider"
  on public.job_offers for update
  using (public.owns_provider_profile(provider_id))
  with check (public.owns_provider_profile(provider_id));

-- ---------------------------------------------------------------------------
-- job_assignments — the provider actually selected for a job.
-- ---------------------------------------------------------------------------
-- Always traces back to an accepted offer (offer_id not null + unique: one
-- assignment per offer). A trigger cross-checks job_id/provider_id against
-- that offer so the two can't drift apart, and a partial unique index
-- blocks more than one *active* assignment per job at a time.
--
-- Only the job owner can create an assignment (accepting is a farmer
-- action); update is also job-owner-only for this phase — provider-side
-- status updates (e.g. marking their own work complete) are a later
-- workflow decision. No delete policy: assignments are history.

create table public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.farm_jobs (id) on delete restrict,
  provider_id uuid not null references public.provider_profiles (id) on delete restrict,
  offer_id uuid not null unique references public.job_offers (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  status text not null default 'assigned'
    check (status in ('assigned', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger job_assignments_set_updated_at
  before update on public.job_assignments
  for each row execute function public.set_updated_at();

-- Only one currently-active (assigned/confirmed) assignment per job — this
-- is what actually prevents "two providers simultaneously assigned to the
-- same job." Completed/cancelled rows stay as history and don't block it.
create unique index job_assignments_single_active_per_job
  on public.job_assignments (job_id)
  where status in ('assigned', 'confirmed');

create index job_assignments_job_id_idx on public.job_assignments (job_id);
create index job_assignments_provider_id_idx on public.job_assignments (provider_id);

create or replace function public.validate_job_assignment_matches_offer()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_offer public.job_offers%rowtype;
begin
  select * into v_offer from public.job_offers where id = new.offer_id;

  if v_offer.job_id is distinct from new.job_id then
    raise exception 'job_assignments.job_id must match job_offers.job_id for offer %', new.offer_id;
  end if;

  if v_offer.provider_id is distinct from new.provider_id then
    raise exception 'job_assignments.provider_id must match job_offers.provider_id for offer %', new.offer_id;
  end if;

  return new;
end;
$$;

create trigger job_assignments_validate_offer_match
  before insert or update of job_id, provider_id, offer_id on public.job_assignments
  for each row execute function public.validate_job_assignment_matches_offer();

-- Accepting an offer means creating an assignment for it; keep the offer's
-- own status in sync automatically rather than granting a separate,
-- broader UPDATE right on job_offers to the job owner.
create or replace function public.sync_offer_status_on_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_offers
  set status = 'accepted'
  where id = new.offer_id
    and status <> 'accepted';
  return new;
end;
$$;

create trigger job_assignments_sync_offer_status
  after insert on public.job_assignments
  for each row execute function public.sync_offer_status_on_assignment();

alter table public.job_assignments enable row level security;

create policy "Job assignments are viewable by job owner or provider"
  on public.job_assignments for select
  using (public.owns_farm_job(job_id) or public.owns_provider_profile(provider_id));

create policy "Job assignments are insertable by job owner"
  on public.job_assignments for insert
  with check (public.owns_farm_job(job_id));

create policy "Job assignments are updatable by job owner"
  on public.job_assignments for update
  using (public.owns_farm_job(job_id))
  with check (public.owns_farm_job(job_id));
