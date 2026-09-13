-- Phase 3C: internal notification foundation.
--
-- Deliberately generic — one table, a controlled `type` enum, and
-- `related_entity_type`/`related_entity_id` instead of per-event tables,
-- so this can grow to cover future event types without new tables.
-- Only the two event types actually wired up in this phase are in the
-- check constraint's initial set; extending it later is a one-line
-- ALTER, not a migration of data.
--
-- This is deliberately an internal-only system: no email/SMS/push send
-- happens anywhere here. A future channel (email, push, WhatsApp) would
-- consume this same table — e.g. a worker process reading unsent rows —
-- rather than needing its own event pipeline. See ARCHITECTURE.md.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('offer_received', 'offer_accepted', 'system')),
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'Internal notifications only — no external delivery (email/SMS/push) happens here yet.';

create index notifications_recipient_id_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- Read/mark-as-read only — no INSERT or DELETE policy at all. A client
-- can never create a notification (for themselves or anyone else) or
-- remove one; every row is written by create_notification(), a
-- SECURITY DEFINER function called only from other trusted server-side
-- functions (submit_job_offer, accept_job_offer).
create policy "Notifications are viewable by recipient"
  on public.notifications for select
  using ((select auth.uid()) = recipient_id);

create policy "Notifications are updatable by recipient"
  on public.notifications for update
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Internal helper: the only way a notification row gets created. Not
-- callable by anon/authenticated directly (see revoke below) — only
-- reachable from other SECURITY DEFINER functions that already decided,
-- server-side, that this specific notification is warranted.
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_related_entity_type text,
  p_related_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (recipient_id, type, title, body, related_entity_type, related_entity_id)
  values (p_recipient_id, p_type, p_title, p_body, p_related_entity_type, p_related_entity_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_notification(uuid, text, text, text, text, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Wire notification generation into the two existing write RPCs (0014).
-- Both are CREATE OR REPLACE with identical signatures — this only adds
-- a notification insert at the end of each, no other behavior changes.
-- ---------------------------------------------------------------------------

create or replace function public.submit_job_offer(
  p_job_id uuid,
  p_provider_id uuid,
  p_price numeric,
  p_message text,
  p_estimated_start timestamptz,
  p_estimated_duration interval
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer_id uuid;
  v_farmer_id uuid;
  v_job_title text;
  v_business_name text;
begin
  if not public.owns_provider_profile(p_provider_id) then
    raise exception 'not authorized';
  end if;

  insert into public.job_offers (job_id, provider_id, price, message, estimated_start, estimated_duration)
  values (p_job_id, p_provider_id, p_price, p_message, p_estimated_start, p_estimated_duration)
  returning id into v_offer_id;

  update public.farm_jobs
  set status = 'offers_received'
  where id = p_job_id and status = 'posted';

  select created_by, title into v_farmer_id, v_job_title from public.farm_jobs where id = p_job_id;
  select business_name into v_business_name from public.provider_profiles where id = p_provider_id;

  perform public.create_notification(
    v_farmer_id,
    'offer_received',
    'New offer received',
    format(
      '%s submitted an offer%s for %s.',
      coalesce(v_business_name, 'A provider'),
      case when p_price is not null then format(' of Rs %s', trim(to_char(p_price, '999,999,999'))) else '' end,
      coalesce(v_job_title, 'your job')
    ),
    'job',
    p_job_id
  );

  return v_offer_id;
end;
$$;

revoke execute on function public.submit_job_offer(uuid, uuid, numeric, text, timestamptz, interval) from public, anon;
grant execute on function public.submit_job_offer(uuid, uuid, numeric, text, timestamptz, interval) to authenticated;

create or replace function public.accept_job_offer(p_offer_id uuid)
returns uuid
language plpgsql
security invoker
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

  insert into public.job_assignments (job_id, provider_id, offer_id)
  values (v_job_id, v_provider_id, p_offer_id)
  returning id into v_assignment_id;

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
