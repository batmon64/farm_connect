-- Phase 3A (2/4): machines, workers, and teams — provider-owned resources,
-- modeled independently from the services they support.
--
-- Scope: machines, machine_services, workers, teams, team_workers.

-- ---------------------------------------------------------------------------
-- machines — physical equipment a provider owns/operates.
-- ---------------------------------------------------------------------------

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  name text not null,
  machine_type text,
  brand text,
  model text,
  description text,
  quantity integer not null default 1 check (quantity > 0),
  location extensions.geography(Point, 4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.machines.machine_type is
  'Free-text category, e.g. Tractor, Brush Cutter, Rotavator, Power Tiller, Chainsaw, Water Pump.';

create trigger machines_set_updated_at
  before update on public.machines
  for each row execute function public.set_updated_at();

create index machines_provider_id_idx on public.machines (provider_id);
create index machines_active_idx on public.machines (provider_id) where is_active;
create index machines_location_idx on public.machines using gist (location);

alter table public.machines enable row level security;

create policy "Machines are viewable by owner"
  on public.machines for select
  using (public.owns_provider_profile(provider_id));

create policy "Machines are insertable by owner"
  on public.machines for insert
  with check (public.owns_provider_profile(provider_id));

create policy "Machines are updatable by owner"
  on public.machines for update
  using (public.owns_provider_profile(provider_id))
  with check (public.owns_provider_profile(provider_id));

create policy "Machines are deletable by owner"
  on public.machines for delete
  using (public.owns_provider_profile(provider_id));

-- ---------------------------------------------------------------------------
-- machine_services — which services a machine can support (many-to-many).
-- ---------------------------------------------------------------------------

create table public.machine_services (
  machine_id uuid not null references public.machines (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  primary key (machine_id, service_id)
);

alter table public.machine_services enable row level security;

create policy "Machine services are viewable by owner"
  on public.machine_services for select
  using (
    exists (
      select 1 from public.machines m
      where m.id = machine_services.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );

create policy "Machine services are insertable by owner"
  on public.machine_services for insert
  with check (
    exists (
      select 1 from public.machines m
      where m.id = machine_services.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );

create policy "Machine services are deletable by owner"
  on public.machine_services for delete
  using (
    exists (
      select 1 from public.machines m
      where m.id = machine_services.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );

-- ---------------------------------------------------------------------------
-- workers — a provider's employees/team members. Not FarmConnect accounts.
-- ---------------------------------------------------------------------------
-- Deliberately no FK to profiles: most workers will never sign up. Linking
-- a worker to a claimed identity is a future phase, not this one.

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  name text not null,
  description text,
  worker_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workers_set_updated_at
  before update on public.workers
  for each row execute function public.set_updated_at();

create index workers_provider_id_idx on public.workers (provider_id);
create index workers_active_idx on public.workers (provider_id) where is_active;

alter table public.workers enable row level security;

create policy "Workers are viewable by owner"
  on public.workers for select
  using (public.owns_provider_profile(provider_id));

create policy "Workers are insertable by owner"
  on public.workers for insert
  with check (public.owns_provider_profile(provider_id));

create policy "Workers are updatable by owner"
  on public.workers for update
  using (public.owns_provider_profile(provider_id))
  with check (public.owns_provider_profile(provider_id));

create policy "Workers are deletable by owner"
  on public.workers for delete
  using (public.owns_provider_profile(provider_id));

-- ---------------------------------------------------------------------------
-- teams / team_workers — grouping a provider's workers.
-- ---------------------------------------------------------------------------
-- member_count is a denormalized convenience field, not a constraint — it's
-- not kept in sync automatically in this phase (no scheduling engine yet).

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  name text not null,
  description text,
  member_count integer not null default 0 check (member_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create index teams_provider_id_idx on public.teams (provider_id);

alter table public.teams enable row level security;

create policy "Teams are viewable by owner"
  on public.teams for select
  using (public.owns_provider_profile(provider_id));

create policy "Teams are insertable by owner"
  on public.teams for insert
  with check (public.owns_provider_profile(provider_id));

create policy "Teams are updatable by owner"
  on public.teams for update
  using (public.owns_provider_profile(provider_id))
  with check (public.owns_provider_profile(provider_id));

create policy "Teams are deletable by owner"
  on public.teams for delete
  using (public.owns_provider_profile(provider_id));

create table public.team_workers (
  team_id uuid not null references public.teams (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  primary key (team_id, worker_id)
);

alter table public.team_workers enable row level security;

-- Ownership is checked on both sides so a provider can't link their team to
-- someone else's worker row (or vice versa) even if they somehow learned
-- its id — both team and worker must belong to the same, current user.
create policy "Team workers are viewable by owner"
  on public.team_workers for select
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_workers.team_id and public.owns_provider_profile(t.provider_id)
    )
    and exists (
      select 1 from public.workers w
      where w.id = team_workers.worker_id and public.owns_provider_profile(w.provider_id)
    )
  );

create policy "Team workers are insertable by owner"
  on public.team_workers for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_workers.team_id and public.owns_provider_profile(t.provider_id)
    )
    and exists (
      select 1 from public.workers w
      where w.id = team_workers.worker_id and public.owns_provider_profile(w.provider_id)
    )
  );

create policy "Team workers are deletable by owner"
  on public.team_workers for delete
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_workers.team_id and public.owns_provider_profile(t.provider_id)
    )
  );
