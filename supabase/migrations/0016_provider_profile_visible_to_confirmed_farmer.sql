-- Bug found during Phase 3B testing: a job owner who accepts an offer
-- gets a job_assignments row and (via 0011) can see the provider's
-- `profiles` row (name/phone) — but never got a matching policy for
-- `provider_profiles` (business_name, description, rating, ...), so the
-- "confirmed provider" view on the farmer's job detail page silently
-- showed nothing (a PostgREST embed just returns null when RLS hides the
-- related row, it doesn't error).
--
-- Combined into the existing owner policy (rather than added as a
-- second permissive one) to match the 0013 cleanup pattern.

drop policy "Provider profiles are viewable by owner" on public.provider_profiles;

create policy "Provider profiles are viewable by owner or assigned-to farmer"
  on public.provider_profiles for select
  using (
    (select auth.uid()) = profile_id
    or exists (
      select 1 from public.job_assignments ja
      join public.farm_jobs fj on fj.id = ja.job_id
      where ja.provider_id = provider_profiles.id
        and ja.status in ('assigned', 'confirmed')
        and fj.created_by = (select auth.uid())
    )
  );
