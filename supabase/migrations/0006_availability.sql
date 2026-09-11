-- Phase 3A (3/4): availability.
--
-- Two different shapes on purpose:
--   provider_availability — recurring weekly hours (a simple calendar).
--   machine_availability  — actual date/time ranges, since a specific
--     machine can be booked independently of the provider's own hours.
-- No calendar engine or conflict-resolution logic here — just the
-- constraints needed so future booking logic can rely on the data being
-- well-formed.

-- ---------------------------------------------------------------------------
-- provider_availability — recurring weekly windows.
-- ---------------------------------------------------------------------------

create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_availability_time_order check (start_time < end_time)
);

comment on column public.provider_availability.day_of_week is
  '0 = Sunday .. 6 = Saturday, matching PostgreSQL''s extract(dow from ...).';

create trigger provider_availability_set_updated_at
  before update on public.provider_availability
  for each row execute function public.set_updated_at();

create index provider_availability_provider_id_idx on public.provider_availability (provider_id);

alter table public.provider_availability enable row level security;

create policy "Provider availability is viewable by owner"
  on public.provider_availability for select
  using (public.owns_provider_profile(provider_id));

create policy "Provider availability is insertable by owner"
  on public.provider_availability for insert
  with check (public.owns_provider_profile(provider_id));

create policy "Provider availability is updatable by owner"
  on public.provider_availability for update
  using (public.owns_provider_profile(provider_id))
  with check (public.owns_provider_profile(provider_id));

create policy "Provider availability is deletable by owner"
  on public.provider_availability for delete
  using (public.owns_provider_profile(provider_id));

-- ---------------------------------------------------------------------------
-- machine_availability — concrete blocked/booked time ranges for a machine.
-- ---------------------------------------------------------------------------
-- A row here means the machine is NOT free for that range (status explains
-- why). Absence of a row means available — there's no separate "available"
-- status, which keeps "is this machine free on date X" a simple range
-- query rather than a full calendar reconciliation.
--
-- The EXCLUDE constraint enforces "no double-booking" for the same machine
-- at the database level, so future job-assignment logic can trust this
-- table instead of re-deriving conflicts itself.

create table public.machine_availability (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked', 'maintenance', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint machine_availability_time_order check (start_at < end_at),
  exclude using gist (
    machine_id with =,
    tstzrange(start_at, end_at) with &&
  )
);

create trigger machine_availability_set_updated_at
  before update on public.machine_availability
  for each row execute function public.set_updated_at();

create index machine_availability_machine_id_idx on public.machine_availability (machine_id);
create index machine_availability_range_idx
  on public.machine_availability using gist (machine_id, tstzrange(start_at, end_at));

alter table public.machine_availability enable row level security;

create policy "Machine availability is viewable by owner"
  on public.machine_availability for select
  using (
    exists (
      select 1 from public.machines m
      where m.id = machine_availability.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );

create policy "Machine availability is insertable by owner"
  on public.machine_availability for insert
  with check (
    exists (
      select 1 from public.machines m
      where m.id = machine_availability.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );

create policy "Machine availability is updatable by owner"
  on public.machine_availability for update
  using (
    exists (
      select 1 from public.machines m
      where m.id = machine_availability.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  )
  with check (
    exists (
      select 1 from public.machines m
      where m.id = machine_availability.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );

create policy "Machine availability is deletable by owner"
  on public.machine_availability for delete
  using (
    exists (
      select 1 from public.machines m
      where m.id = machine_availability.machine_id
        and public.owns_provider_profile(m.provider_id)
    )
  );
