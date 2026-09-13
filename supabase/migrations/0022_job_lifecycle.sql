-- Phase 4: job lifecycle (confirmed -> in_progress -> completed, plus
-- cancellation from confirmed or in_progress).
--
-- farm_jobs.status already allowed 'in_progress'/'completed'/'cancelled'
-- in its CHECK constraint since 0007 -- this phase only adds the
-- timestamp/cancellation columns the lifecycle needs and the RPC that
-- enforces the state machine. No enum widening required.
--
-- Design decision: job_assignments.status is intentionally NOT part of
-- this lifecycle and is never touched by transition_job_status(). It
-- stays at 'assigned' (the value accept_job_offer already sets) for the
-- lifetime of the assignment, including through in_progress/completed/
-- cancelled. Two things depend on that value staying in
-- ('assigned', 'confirmed'): the "one active assignment per job" partial
-- unique index (0007) and the privacy-unlock checks
-- (is_assigned_provider_for_job / the profiles counterparty policy,
-- both 0011) that grant exact location/phone once a provider is
-- assigned. Leaving job_assignments.status untouched keeps that
-- privacy unlock correctly "on" for the rest of the job's life
-- (including a cancelled job, where both parties still reasonably need
-- each other's contact info as history) without introducing a second,
-- parallel status vocabulary that could drift from farm_jobs.status.
-- farm_jobs.status is the single canonical lifecycle field; the one
-- existing reader of job_assignments.status for lifecycle purposes
-- (the provider Work page) is updated in the app layer to read
-- farm_jobs.status instead.

alter table public.farm_jobs
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles (id) on delete restrict,
  add column cancellation_reason text;

alter table public.farm_jobs
  add constraint farm_jobs_cancellation_consistency
  check ((cancelled_at is null) = (cancelled_by is null));

-- New notification types for lifecycle events, alongside the existing
-- offer_received/offer_accepted/system set (0017).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'offer_received', 'offer_accepted', 'system',
    'job_started', 'job_completed', 'job_cancelled'
  ));

-- ---------------------------------------------------------------------------
-- transition_job_status — the only way farm_jobs.status moves past
-- 'confirmed'. Client cannot UPDATE farm_jobs.status directly for these
-- values; SECURITY DEFINER because the provider side of this (start,
-- and provider-side complete) is not the job owner and has no farm_jobs
-- UPDATE grant under the existing "updatable by owner" RLS policy.
--
-- State machine (the only legal (from_status, action, actor) triples):
--   confirmed   --start-->    in_progress   [assigned provider only]
--   confirmed   --complete--> completed     [farmer only]
--   in_progress --complete--> completed     [farmer OR assigned provider]
--   confirmed   --cancel-->   cancelled     [farmer only]
--   in_progress --cancel-->   cancelled     [farmer only]
-- Every other (status, action) combination is rejected, including from
-- any terminal state (completed, cancelled) and from any pre-confirmed
-- state (draft/posted/matching/offers_received) -- there is no action
-- string that reaches farm_jobs.status through this function except via
-- one of the five rows above.
--
-- Concurrency: `select ... for update` takes a row lock so a second
-- concurrent caller blocks until the first transaction commits, then
-- re-reads the now-current status -- it can never act on stale state.
-- The final `update ... where status = <status read under the lock>`
-- is a belt-and-suspenders guard that makes the atomicity assumption
-- self-documenting even though the row lock already prevents the race.
-- ---------------------------------------------------------------------------

create or replace function public.transition_job_status(
  p_job_id uuid,
  p_action text,
  p_cancellation_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_job public.farm_jobs%rowtype;
  v_provider_profile_id uuid;
  v_provider_auth_id uuid;
  v_business_name text;
  v_is_owner boolean;
  v_is_provider boolean;
  v_new_status text;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  select * into v_job from public.farm_jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'job not found';
  end if;

  v_is_owner := v_job.created_by = v_caller;

  select pp.id into v_provider_profile_id
  from public.provider_profiles pp
  where pp.profile_id = v_caller;

  v_is_provider := v_provider_profile_id is not null and exists (
    select 1 from public.job_assignments ja
    where ja.job_id = p_job_id
      and ja.provider_id = v_provider_profile_id
      and ja.status in ('assigned', 'confirmed')
  );

  if not v_is_owner and not v_is_provider then
    raise exception 'not authorized';
  end if;

  if p_action = 'start' then
    if not v_is_provider then
      raise exception 'only the assigned provider can start this job';
    end if;
    if v_job.status <> 'confirmed' then
      raise exception 'job is not in a startable state';
    end if;
    v_new_status := 'in_progress';

  elsif p_action = 'complete' then
    if v_is_provider and v_job.status = 'in_progress' then
      v_new_status := 'completed';
    elsif v_is_owner and v_job.status in ('confirmed', 'in_progress') then
      v_new_status := 'completed';
    else
      raise exception 'job is not in a completable state for this user';
    end if;

  elsif p_action = 'cancel' then
    if not v_is_owner then
      raise exception 'only the farmer can cancel this job';
    end if;
    if v_job.status not in ('confirmed', 'in_progress') then
      raise exception 'job is not in a cancellable state';
    end if;
    v_new_status := 'cancelled';

  else
    raise exception 'unknown action: %', p_action;
  end if;

  update public.farm_jobs
  set
    status = v_new_status,
    started_at = case when v_new_status = 'in_progress' then now() else started_at end,
    completed_at = case when v_new_status = 'completed' then now() else completed_at end,
    cancelled_at = case when v_new_status = 'cancelled' then now() else cancelled_at end,
    cancelled_by = case when v_new_status = 'cancelled' then v_caller else cancelled_by end,
    cancellation_reason = case when v_new_status = 'cancelled' then p_cancellation_reason else cancellation_reason end
  where id = p_job_id and status = v_job.status;

  if not found then
    raise exception 'job status changed, please refresh and try again';
  end if;

  select pp.profile_id, pp.business_name into v_provider_auth_id, v_business_name
  from public.job_assignments ja
  join public.provider_profiles pp on pp.id = ja.provider_id
  where ja.job_id = p_job_id and ja.status in ('assigned', 'confirmed')
  limit 1;

  if v_is_provider then
    perform public.create_notification(
      v_job.created_by,
      case v_new_status when 'in_progress' then 'job_started' else 'job_completed' end,
      case v_new_status when 'in_progress' then 'Work has started' else 'Job marked completed' end,
      case v_new_status
        when 'in_progress' then format('%s started your job "%s".', coalesce(v_business_name, 'Your provider'), v_job.title)
        else format('%s marked your job "%s" as completed.', coalesce(v_business_name, 'Your provider'), v_job.title)
      end,
      'job',
      p_job_id
    );
  elsif v_provider_auth_id is not null and v_new_status in ('completed', 'cancelled') then
    perform public.create_notification(
      v_provider_auth_id,
      case v_new_status when 'completed' then 'job_completed' else 'job_cancelled' end,
      case v_new_status when 'completed' then 'Job marked completed' else 'Job cancelled' end,
      case v_new_status
        when 'completed' then format('The farmer marked "%s" as completed.', v_job.title)
        else format(
          'Your job "%s" was cancelled.%s',
          v_job.title,
          case when p_cancellation_reason is not null and p_cancellation_reason <> ''
            then format(' Reason: %s', p_cancellation_reason) else '' end
        )
      end,
      'job',
      p_job_id
    );
  end if;
end;
$$;

revoke execute on function public.transition_job_status(uuid, text, text) from public, anon;
grant execute on function public.transition_job_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pending-offer behavior after confirmation (Part O decision): once one
-- offer is accepted, every other still-pending offer on that job is
-- deterministically rejected in the same transaction, rather than left
-- dangling in 'pending' forever or requiring a separate cleanup step.
-- The accepted offer's own flip to 'accepted' already happens via the
-- existing sync_offer_status_on_assignment trigger (0007) -- this only
-- adds the sibling-rejection side effect.
-- ---------------------------------------------------------------------------

create or replace function public.accept_job_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_provider_id uuid;
  v_assignment_id uuid;
  v_provider_profile_id uuid;
  v_job_title text;
begin
  select job_id, provider_id into v_job_id, v_provider_id
  from public.job_offers where id = p_offer_id;

  if v_job_id is null then
    raise exception 'offer not found';
  end if;

  if not exists (
    select 1 from public.farm_jobs where id = v_job_id and created_by = (select auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.job_assignments (job_id, provider_id, offer_id)
  values (v_job_id, v_provider_id, p_offer_id)
  returning id into v_assignment_id;

  update public.job_offers
  set status = 'rejected'
  where job_id = v_job_id and id <> p_offer_id and status = 'pending';

  update public.farm_jobs set status = 'confirmed' where id = v_job_id;

  select profile_id into v_provider_profile_id from public.provider_profiles where id = v_provider_id;
  select title into v_job_title from public.farm_jobs where id = v_job_id;

  perform public.create_notification(
    v_provider_profile_id,
    'offer_accepted',
    'Your offer was accepted',
    format('You are confirmed for "%s". The exact location and contact details are now available.', coalesce(v_job_title, 'a job')),
    'job',
    v_job_id
  );

  return v_assignment_id;
end;
$$;

revoke execute on function public.accept_job_offer(uuid) from public, anon;
grant execute on function public.accept_job_offer(uuid) to authenticated;
