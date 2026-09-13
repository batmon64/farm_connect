-- Phase 5: trust & reputation. One reviews table, tied to a completed
-- job_assignments row (not merely "two user ids"), supporting both
-- review directions (farmer -> provider, provider -> farmer) through
-- the same columns rather than two parallel tables.
--
-- reviewer_id/reviewee_id reference profiles(id) uniformly regardless
-- of which side is the farmer and which is the provider — a review is
-- fundamentally "one user rating another user for a shared job", and
-- profiles.id is the one identity space both roles already share.
--
-- Uniqueness is enforced as (assignment_id, reviewer_id) rather than a
-- separate "direction" column: an assignment has exactly two possible
-- reviewers (the farmer and the assigned provider), so this constraint
-- alone is both "one review per reviewer per assignment" and, in
-- combination with there being only two eligible reviewers, "one
-- review per direction per assignment" — no extra column needed.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.farm_jobs (id) on delete restrict,
  assignment_id uuid not null references public.job_assignments (id) on delete restrict,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  reviewee_id uuid not null references public.profiles (id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  constraint reviews_no_self_review check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_assignment_per_reviewer unique (assignment_id, reviewer_id)
);

comment on table public.reviews is
  'Immutable once created — no update/delete policy exists for any role, by product decision (Phase 5). A correction path, if ever needed, is a future design, not an edit.';

create index reviews_reviewee_id_idx on public.reviews (reviewee_id, created_at desc);
create index reviews_job_id_idx on public.reviews (job_id);

alter table public.reviews enable row level security;

-- SELECT: a provider-directed review is marketplace-public (that's the
-- whole point of the reputation layer — any signed-in user browsing
-- providers needs to read it), scoped to authenticated users the same
-- way every other marketplace read in this app is. A farmer-directed
-- review (provider rating a farmer) is visible only to the two people
-- who were actually part of that job — there's no farmer-facing public
-- profile surface in this phase to justify broader exposure, but nothing
-- here would need to change if one is added later, since the reviewer
-- and reviewee can already read their own.
create policy "Reviews are viewable by marketplace or participants"
  on public.reviews for select
  using (
    (select auth.uid()) is not null
    and (
      exists (select 1 from public.provider_profiles pp where pp.profile_id = reviews.reviewee_id)
      or reviewer_id = (select auth.uid())
      or reviewee_id = (select auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policy at all — mirrors the notifications
-- pattern (0017). A review can only be created through submit_review()
-- below; once created, it is immutable for every role including the
-- author, by explicit product decision.

-- ---------------------------------------------------------------------------
-- submit_review — the only way a review row is created. Re-derives
-- reviewer/reviewee/job/eligibility from the assignment itself; the
-- client supplies only assignment_id, rating, and an optional comment.
-- SECURITY DEFINER because the reviewee side of this update touches
-- provider_profiles aggregates the caller doesn't own.
-- ---------------------------------------------------------------------------

create or replace function public.submit_review(
  p_assignment_id uuid,
  p_rating integer,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_job public.farm_jobs%rowtype;
  v_assignment public.job_assignments%rowtype;
  v_provider_auth_id uuid;
  v_reviewee_id uuid;
  v_review_id uuid;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  if p_comment is not null and char_length(p_comment) > 500 then
    raise exception 'comment is too long';
  end if;

  select * into v_assignment from public.job_assignments where id = p_assignment_id;
  if v_assignment.id is null then
    raise exception 'assignment not found';
  end if;

  select * into v_job from public.farm_jobs where id = v_assignment.job_id;
  if v_job.id is null or v_job.status <> 'completed' then
    raise exception 'job is not completed yet';
  end if;

  select profile_id into v_provider_auth_id
  from public.provider_profiles where id = v_assignment.provider_id;

  if v_caller = v_job.created_by then
    v_reviewee_id := v_provider_auth_id;
  elsif v_caller = v_provider_auth_id then
    v_reviewee_id := v_job.created_by;
  else
    raise exception 'not authorized';
  end if;

  if v_reviewee_id is null then
    raise exception 'reviewee could not be determined';
  end if;

  insert into public.reviews (job_id, assignment_id, reviewer_id, reviewee_id, rating, comment)
  values (v_job.id, v_assignment.id, v_caller, v_reviewee_id, p_rating, nullif(trim(p_comment), ''))
  returning id into v_review_id;

  return v_review_id;
exception
  when unique_violation then
    raise exception 'you have already reviewed this job';
end;
$$;

revoke execute on function public.submit_review(uuid, integer, text) from public, anon;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Rating aggregation — database-controlled, recalculated from scratch
-- on every insert (reviews volume in this prototype is small; a full
-- recount avoids incremental-average drift entirely). No-ops when the
-- reviewee isn't a provider (a provider->farmer review never touches
-- provider_profiles — see "Farmer reputation" in ARCHITECTURE.md for
-- why farmers don't get a stored aggregate in this phase).
-- ---------------------------------------------------------------------------

create or replace function public.update_provider_rating_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.provider_profiles where profile_id = new.reviewee_id) then
    return new;
  end if;

  update public.provider_profiles pp
  set
    rating_count = agg.cnt,
    rating_average = agg.avg_rating
  from (
    select count(*) as cnt, round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews
    where reviewee_id = new.reviewee_id
  ) agg
  where pp.profile_id = new.reviewee_id;

  return new;
end;
$$;

create trigger reviews_update_provider_rating
  after insert on public.reviews
  for each row execute function public.update_provider_rating_aggregate();

-- ---------------------------------------------------------------------------
-- completed_jobs_count was defined on provider_profiles since 0004 but
-- nothing has ever written to it — every real provider has been stuck
-- at its default 0 even after Phase 4 added real job completion. Fixed
-- here with a trigger on farm_jobs rather than inside
-- transition_job_status, so it stays correct regardless of which future
-- code path ever changes a job to 'completed'.
-- ---------------------------------------------------------------------------

create or replace function public.increment_provider_completed_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.provider_profiles pp
    set completed_jobs_count = completed_jobs_count + 1
    from public.job_assignments ja
    where ja.job_id = new.id
      and ja.status in ('assigned', 'confirmed')
      and pp.id = ja.provider_id;
  end if;
  return new;
end;
$$;

create trigger farm_jobs_increment_completed_count
  after update of status on public.farm_jobs
  for each row execute function public.increment_provider_completed_jobs();

-- ---------------------------------------------------------------------------
-- get_provider_reviews — the only way review content is read for
-- display. Returns a privacy-safe reviewer label ("Anil K." style —
-- first name plus last-initial, never the full display_name, phone, or
-- profile id) instead of exposing raw profiles columns to anyone
-- browsing a provider's reviews.
-- ---------------------------------------------------------------------------

create or replace function public.get_provider_reviews(p_provider_profile_id uuid)
returns table (
  id uuid,
  rating integer,
  comment text,
  created_at timestamptz,
  reviewer_label text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id, r.rating, r.comment, r.created_at,
    case
      when p.display_name is null or trim(p.display_name) = '' then 'A FarmConnect user'
      when position(' ' in trim(p.display_name)) = 0 then trim(p.display_name)
      else split_part(trim(p.display_name), ' ', 1)
        || ' ' || left(split_part(trim(p.display_name), ' ', 2), 1) || '.'
    end
  from public.reviews r
  join public.provider_profiles pp on pp.profile_id = r.reviewee_id
  join public.profiles p on p.id = r.reviewer_id
  where pp.id = p_provider_profile_id
  order by r.created_at desc;
$$;

revoke execute on function public.get_provider_reviews(uuid) from public, anon;
grant execute on function public.get_provider_reviews(uuid) to authenticated;
