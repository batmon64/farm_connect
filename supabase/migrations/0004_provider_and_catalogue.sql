-- Phase 3A (1/4): extensions, provider identity, and the service catalogue.
--
-- Scope: provider_profiles, service_categories, services, provider_services.
-- No marketplace UI, matching, or job tables yet — see 0007 for jobs/offers.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- Spatial types/functions for provider and job locations ("providers within
-- X km of a job" queries land in a later phase; this just lays the column
-- + index groundwork).
create extension if not exists postgis with schema extensions;

-- Lets a GiST index/EXCLUDE constraint use plain equality (=) alongside a
-- range overlap (&&) check — needed for machine_availability in 0005.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- provider_profiles — the service-provider identity of a profile.
-- ---------------------------------------------------------------------------
-- One profile can have at most one provider_profiles row (profile_id is
-- unique). A profile's is_provider flag (Phase 2) says "this account acts
-- as a provider"; this table holds what that provider actually looks like.
-- Cascades with its owning profile — it's identity data, not shared
-- transaction history (contrast with farm_jobs/job_offers below, which
-- deliberately do NOT cascade).

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text,
  description text,
  service_radius_km numeric check (service_radius_km is null or service_radius_km > 0),
  location extensions.geography(Point, 4326),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified')),
  rating_average numeric(3, 2) check (rating_average is null or (rating_average between 0 and 5)),
  rating_count integer not null default 0 check (rating_count >= 0),
  completed_jobs_count integer not null default 0 check (completed_jobs_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.provider_profiles is
  'Service-provider identity for a profile. Verification is informational for MVP, not enforced.';

create trigger provider_profiles_set_updated_at
  before update on public.provider_profiles
  for each row execute function public.set_updated_at();

create index provider_profiles_profile_id_idx on public.provider_profiles (profile_id);
create index provider_profiles_active_idx on public.provider_profiles (is_active) where is_active;
create index provider_profiles_location_idx on public.provider_profiles using gist (location);

alter table public.provider_profiles enable row level security;

-- Reusable RLS predicate: does the current user own this provider profile?
-- SECURITY DEFINER is required so it can be called from policies on OTHER
-- tables (provider_services, machines, ...) regardless of provider_profiles'
-- own RLS — it only ever returns a boolean tied to auth.uid(), never rows.
create or replace function public.owns_provider_profile(target_provider_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.provider_profiles
    where id = target_provider_id
      and profile_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_provider_profile(uuid) from public, anon;
grant execute on function public.owns_provider_profile(uuid) to authenticated;

-- Owner-only for now. Public/marketplace read (e.g. "browse active,
-- verified providers") is deferred until the exact fields safe to expose
-- are decided — see ARCHITECTURE.md.
create policy "Provider profiles are viewable by owner"
  on public.provider_profiles for select
  using ((select auth.uid()) = profile_id);

create policy "Provider profiles are insertable by owner"
  on public.provider_profiles for insert
  with check ((select auth.uid()) = profile_id);

create policy "Provider profiles are updatable by owner"
  on public.provider_profiles for update
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "Provider profiles are deletable by owner"
  on public.provider_profiles for delete
  using ((select auth.uid()) = profile_id);

-- ---------------------------------------------------------------------------
-- service_categories / services — the shared service catalogue.
-- ---------------------------------------------------------------------------
-- Reference data: not owned by any one user, publicly readable, writable
-- only via migrations/service-role (no end-user write policy at all).
-- Deactivate (is_active = false) rather than delete once real listings
-- reference a row.

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

alter table public.service_categories enable row level security;

create policy "Service categories are publicly readable"
  on public.service_categories for select
  using (true);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories (id) on delete restrict,
  name text not null,
  description text,
  unit_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

comment on column public.services.unit_type is
  'Free-text unit the service is typically quoted in, e.g. acre, hour, tree.';

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create index services_category_id_idx on public.services (category_id);
create index services_active_idx on public.services (is_active) where is_active;

alter table public.services enable row level security;

create policy "Services are publicly readable"
  on public.services for select
  using (true);

-- ---------------------------------------------------------------------------
-- provider_services — services a specific provider actually offers.
-- ---------------------------------------------------------------------------
-- Pricing is optional (min_price/max_price both nullable) — a provider may
-- prefer to quote per job via an offer instead of listing a price range.

create table public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  description text,
  min_price numeric check (min_price is null or min_price >= 0),
  max_price numeric check (max_price is null or max_price >= 0),
  pricing_unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, service_id),
  constraint provider_services_price_range check (
    min_price is null or max_price is null or min_price <= max_price
  )
);

create trigger provider_services_set_updated_at
  before update on public.provider_services
  for each row execute function public.set_updated_at();

create index provider_services_provider_id_idx on public.provider_services (provider_id);
create index provider_services_service_id_idx on public.provider_services (service_id);
create index provider_services_active_idx on public.provider_services (provider_id) where is_active;

alter table public.provider_services enable row level security;

create policy "Provider services are viewable by owner"
  on public.provider_services for select
  using (public.owns_provider_profile(provider_id));

create policy "Provider services are insertable by owner"
  on public.provider_services for insert
  with check (public.owns_provider_profile(provider_id));

create policy "Provider services are updatable by owner"
  on public.provider_services for update
  using (public.owns_provider_profile(provider_id))
  with check (public.owns_provider_profile(provider_id));

create policy "Provider services are deletable by owner"
  on public.provider_services for delete
  using (public.owns_provider_profile(provider_id));

-- ---------------------------------------------------------------------------
-- Seed data — small, representative, easy to extend later.
-- ---------------------------------------------------------------------------

insert into public.service_categories (name, description) values
  ('Land Preparation', 'Preparing land ahead of planting'),
  ('Vegetation Management', 'Clearing and controlling vegetation growth'),
  ('Harvesting', 'Harvesting crops and produce'),
  ('Plantation Services', 'Ongoing plantation and tree-crop upkeep'),
  ('Irrigation', 'Watering and irrigation work'),
  ('Transportation', 'Moving produce, machinery, or materials');

insert into public.services (category_id, name, description, unit_type)
select c.id, s.name, s.description, s.unit_type
from (values
  ('Land Preparation', 'Land Clearing', 'Clearing land of debris and unwanted growth before cultivation', 'acre'),
  ('Land Preparation', 'Ploughing', 'Turning and loosening soil ahead of planting', 'acre'),
  ('Land Preparation', 'Tilling', 'Breaking up and levelling soil', 'acre'),
  ('Vegetation Management', 'Grass Cutting', 'Cutting grass and overgrowth', 'acre'),
  ('Vegetation Management', 'Spraying', 'Pesticide or fertilizer spraying', 'acre'),
  ('Harvesting', 'Harvesting', 'Harvesting ready crops', 'acre'),
  ('Plantation Services', 'Coconut Tree Climbing', 'Climbing for harvest, inspection, or maintenance', 'tree'),
  ('Irrigation', 'Irrigation Work', 'Setting up or running irrigation', 'hour')
) as s(category_name, name, description, unit_type)
join public.service_categories c on c.name = s.category_name;
