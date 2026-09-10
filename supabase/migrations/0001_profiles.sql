-- Application profile linked 1:1 with a Supabase Auth user.
--
-- Identity vs. profile: auth.users holds the login credential (email +
-- password, managed by Supabase Auth). This table holds everything about
-- how that person uses FarmConnect — display name, contact info, and
-- which marketplace capabilities they've opted into.
--
-- is_farmer / is_provider are independent booleans, not a single
-- exclusive role: a person can be a farmer, a provider, or both at once,
-- and can change that later without changing identity.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  location text,
  is_farmer boolean not null default false,
  is_provider boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_onboarding_requires_capability
    check (not onboarding_completed or is_farmer or is_provider)
);

alter table public.profiles enable row level security;

-- A user may only see, create, or edit their own profile row. auth.uid()
-- comes from the caller's verified JWT — never trust a client-supplied id.
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Keep updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row the moment a Supabase Auth user is created,
-- so one exists even before email confirmation / onboarding completes.
-- SECURITY DEFINER is required here: this runs during signup before the
-- new user has a session, so it can't satisfy the RLS insert policy above
-- on its own.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
