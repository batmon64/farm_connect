-- Wrap auth.uid() in a scalar subquery so Postgres evaluates it once per
-- query (initplan) instead of once per row — same security semantics,
-- better performance at scale (advisor: auth_rls_initplan).

drop policy "Profiles are viewable by owner" on public.profiles;
drop policy "Profiles are insertable by owner" on public.profiles;
drop policy "Profiles are updatable by owner" on public.profiles;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
