# FarmConnect — Architecture

Practical conventions for this codebase. Keep this short and update it as
conventions actually change — don't let it drift from the code.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui, backed by
Supabase (Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions).
Deployed on Vercel. No separate backend server — Supabase is the backend.

## Project structure

```
src/
  app/                  Routes only (App Router). Pages, layouts,
                         loading.tsx, error.tsx, route handlers.
  components/
    ui/                 shadcn/ui primitives (button, card, sheet, ...).
                         Generated via `npx shadcn add <component>` —
                         don't hand-edit these beyond what shadcn generates.
    layout/             App-wide chrome: header, footer, nav. Not tied to
                         one feature.
  features/             Feature-specific code, one folder per feature
                         (e.g. features/auth/, future features/jobs/).
                         Each feature folder owns its own components,
                         server actions, schemas, and feature-local types.
  lib/
    supabase/           Supabase client factories: client.ts, server.ts,
                         middleware.ts. See "Supabase access" below.
    env.ts               Typed, validated access to environment variables.
    get-origin.ts         Request origin, for building auth email redirect
                           URLs.
    utils.ts             Generic helpers (currently just shadcn's `cn`).
  types/                 Shared cross-feature types (profile.ts mirrors
                          the profiles table — see "Auth" below).
  proxy.ts                Next.js middleware entry point, scoped to
                           Supabase-dependent routes only (see below).
supabase/
  migrations/             Hand-written SQL migrations. No Supabase project
                           is linked from this repo (no `supabase/config.toml`)
                           — applied via the connected Supabase tooling or
                           the SQL editor, numbered sequentially, never
                           edited once applied to the live project.
```

Rule of thumb: if code is used by exactly one feature, it lives inside that
feature's folder under `src/features/`. If it's shared UI chrome or a
cross-cutting concern, it lives in `src/components/layout` or `src/lib`.
`src/components/ui` is reserved for shadcn primitives — compose them into
feature UI rather than editing them.

## Supabase access

Three entry points, matching where the code runs:

- `src/lib/supabase/client.ts` — `createClient()` for Client Components.
  Uses the public anon key. Import only from files with `"use client"`.
- `src/lib/supabase/server.ts` — `createClient()` (async) for Server
  Components, Server Actions, and Route Handlers. Also uses the anon key,
  scoped by the request's session via cookies — RLS still applies.
- `src/lib/supabase/middleware.ts` — `updateSession()`, wired into
  `src/proxy.ts` (Next.js's middleware entry point — Next 16 renamed the
  file convention from `middleware.ts` to `proxy.ts`, same mechanism).
  Refreshes the session cookie so server components see a valid session.

`src/proxy.ts`'s matcher is scoped to only the routes that touch Supabase
(`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/*`,
`/onboarding`, `/app/*`) — it deliberately never runs on `/`, `/farmer`,
or `/provider`, so the public marketing pages can never depend on
Supabase being configured. Every one of those Supabase-touching routes
also checks `env.isSupabaseConfiguredPublic()` (a non-throwing check)
before rendering a form, and `getHeaderAuthState()` (used by
`SiteHeader`, which renders on every page) wraps its Supabase call in
try/catch and falls back to the logged-out header on any failure —
config missing or a network error alike. Follow this pattern for any new
Supabase-dependent route: check config first, degrade to a clear message
or safe fallback, never let a missing/unreachable Supabase break
rendering.

There is deliberately no service-role client yet. Add one only when
server-only, RLS-bypassing access is actually needed (e.g. an admin
action or an Edge Function). It must read `env.supabaseServiceRoleKey()`
and never be imported from a Client Component or any code path reachable
from the browser bundle.

Never disable RLS to make a query "just work" — fix the policy instead.

## Auth and user identity

Identity (Supabase Auth: email + password, `auth.users`) is kept separate
from the application profile (`public.profiles`, one row per user, holds
display name, phone, location, and marketplace capabilities). Phone
number is a profile field, not a credential — this is intentional, so
phone verification can be added later without touching the identity
model.

Farmer and provider are independent booleans (`is_farmer`, `is_provider`)
on the profile, not a single exclusive role — a person can be either or
both. Don't reintroduce an exclusive `role` enum for this.

Auth feature code lives in `src/features/auth/`:

- `schemas.ts` — zod schemas, the single source of truth for validation
  rules (password policy, etc.), used by both the client-rendered forms
  and the server actions that enforce them.
- `actions.ts` — Server Actions (`"use server"`) for sign up, log in, log
  out, password reset, resend verification, and completing onboarding.
  Each checks `env.isSupabaseConfiguredPublic()` first and wraps Supabase
  calls in try/catch, returning a typed `AuthFormState` rather than
  throwing, so forms can show inline errors instead of crashing to the
  nearest error boundary.
- `errors.ts` — translates raw Supabase Auth error messages into
  user-facing copy. Extend `mapAuthError` here, not inline in components.
- `profile.ts` / `session-status.ts` — server-side helpers to fetch the
  current user + profile. Use `getUser()`, not `getSession()`, for any
  access-control decision — it revalidates the JWT against the Supabase
  Auth server instead of trusting the cookie.
- `components/` — form components (client components using React 19's
  `useActionState`) and `AuthShell`, the shared card layout for auth
  pages.

Routing/access control is enforced in layouts, not in `src/proxy.ts`
(middleware only refreshes the session cookie — it doesn't query the
database):

- `src/app/app/layout.tsx` — requires a signed-in user with
  `onboarding_completed`; redirects to `/login` or `/onboarding`
  otherwise.
- `src/app/onboarding/page.tsx` — requires a signed-in user; redirects
  completed users to `/app`.
- `src/app/login/page.tsx` / `signup/page.tsx` — redirect an
  already-signed-in user to `/app` or `/onboarding`.

A note on Next.js's render model: a layout and its page render
concurrently, not sequentially — a page can't rely on its layout's
redirect/guard having "already happened" before the page body runs. Each
protected page in `src/app/app/` should assume it might execute even on a
request the layout will redirect away from, and stay safe if so
(`src/app/app/page.tsx` bails out early when Supabase isn't configured
for exactly this reason).

**Email confirmation flow**: Supabase's email templates must link to
`/auth/confirm?token_hash=...&type=...&next=...` (the `token_hash` flow,
verified server-side via `supabase.auth.verifyOtp` in
`src/app/auth/confirm/route.ts`) rather than the default
`{{ .ConfirmationURL }}`. See the Supabase dashboard configuration steps
in the README. An invalid or expired link lands on `/auth/error`.

## Marketplace data model (Phase 3A)

Database/backend foundation only — no marketplace UI exists yet (no job
creation form, provider dashboard, offer UI, etc.). The schema exists so
those features have something correct to build against.

**Core distinction the schema enforces**: a *provider profile* (business
identity — can list services, own machines, employ workers) is separate
from a *user profile* (Phase 2 identity). A profile's `is_provider` flag
just means "this account may act as a provider"; `provider_profiles` is
what that provider actually looks like, and doesn't exist until they
create one.

```
profiles (Phase 2)
  └─ provider_profiles          1:1, cascades with the profile
       ├─ provider_services     services this provider offers  ─┐
       ├─ machines               ├─ machine_services            ├─ → services
       │    └─ machine_availability (date/time ranges, booked)  │  (catalogue)
       ├─ workers                                                │
       ├─ teams ── team_workers → workers                        │
       └─ provider_availability (recurring weekly hours)         │
                                                                  │
service_categories → services  ───────────────────────────────────┘
  (public reference catalogue — seeded, not owned by any user)

profiles (Phase 2)
  └─ farm_jobs                  owned by the farmer (created_by)
       ├─ job_services            }
       ├─ job_machine_requirements } what the job needs — kept
       ├─ job_worker_requirements  } separate from farm_jobs itself
       ├─ job_offers ← provider_profiles   a provider's response
       │    (NOT a reservation — see below)
       └─ job_assignments ← job_offers      the provider actually
            (one active assignment per job, enforced by a partial       selected
            unique index; always traces back to an accepted offer)
```

**An offer is not a reservation** (explicit product rule): submitting a
`job_offers` row never touches `machine_availability` or locks anything.
Only a `job_assignments` row represents real commitment. Accepting an
offer means the job owner creates a `job_assignments` row referencing it;
a trigger (`sync_offer_status_on_assignment`) then flips that offer to
`'accepted'` automatically — the job owner never gets UPDATE rights on
`job_offers` directly, so "accept" stays a single controlled code path
rather than an open grant. A second trigger
(`validate_job_assignment_matches_offer`) rejects an assignment whose
`job_id`/`provider_id` don't match the offer it claims to come from.

**Deletion behavior** — two different rules, deliberately:
- Provider-owned resources (`machines`, `workers`, `teams`,
  `provider_services`, `provider_availability`, `machine_services`,
  `team_workers`) **cascade** with their `provider_profiles` row. Only
  the provider has a stake in these; if they delete their provider
  profile, their listings should go with it.
- `farm_jobs`, `job_offers`, and `job_assignments` **restrict** deletion
  of the `profiles`/`provider_profiles` row they reference. A job is
  shared history between a farmer and provider(s) — it must not
  disappear because one party's profile was deleted. (Account-deletion
  flows that need to handle this — anonymize instead of delete, etc. —
  are a future, dedicated design, not an FK cascade.)
- Catalogue rows (`service_categories`, `services`) use `ON DELETE
  RESTRICT` from anything that references them — deactivate
  (`is_active = false`) instead of deleting once something depends on a
  row.

**RLS**: every table owner-scoped (no cross-user read/write) except the
catalogue (`service_categories`/`services`, publicly readable, writable
only via migrations — there's no end-user write policy at all). Two
reusable `SECURITY DEFINER` predicate functions —
`owns_provider_profile(id)` and `owns_farm_job(id)` — back most
policies; they only ever return a boolean tied to `auth.uid()`, so
they're safe to grant `EXECUTE` to `anon`/`authenticated` (a policy
calling them needs the querying role to have that grant, unlike
trigger-only functions). `job_offers` is the one asymmetric case: a
provider manages their own offers, but the job owner gets read-only
visibility into all offers on their job, not write access — enforced
via the OR in its SELECT policy, not a separate owner-write path.

**Deliberately deferred** (do not build ahead of the phase that needs it):
- Public/marketplace read access to `provider_profiles`, `machines`, or
  `farm_jobs` (e.g. "browse active providers", "browse posted jobs near
  me") — needs a decision about exactly which fields are safe to expose
  before any policy is written, not just RLS plumbing.
- Automatic `farm_jobs.status` transitions — the app sets status
  explicitly; the column just constrains it to a known set.
- Worker/machine-to-assignment junction tables (i.e. which specific
  worker or machine actually got sent) — `job_assignments.id` is a
  stable PK a future table can reference, but that table doesn't exist
  yet.
- The spatial "providers within X km of a job" query — `geography(Point,
  4326)` columns and GiST indexes exist on `provider_profiles`,
  `machines`, and `farm_jobs` for this, but no query/matching logic.
- Provider-side status updates on `job_assignments` (e.g. marking their
  own work complete) — update is job-owner-only for now.

## Marketplace UI (Phase 3B)

The first working marketplace loop: farmer posts a job → provider
discovers it → provider offers → farmer accepts → both see the
confirmed job. Built on the Phase 3A schema — see "Marketplace data
model" above for the tables this section's routes and RPCs sit on top of.

**Routing.** `/app/**` is one authenticated tree with two sub-experiences
sharing a layout:
- `/app`, `/app/jobs*`, `/app/notifications`, `/app/profile` — farmer.
- `/app/provider*` — provider (its own `layout.tsx` redirects to `/app`
  if `!profile.is_provider`).

`AppShell` (`src/features/marketplace/components/app-shell.tsx`) reads
the current pathname to decide which of the two bottom-nav sets to show,
and — when a profile has both capabilities — renders a "Switch to
Farmer/Provider" banner linking between `/app` and `/app/provider`. This
is the one role-switching mechanism; there's no per-request role state
beyond it. The root layout hides the public marketing header/footer/nav
for `/app/**` (via an `x-pathname` header `src/proxy.ts` sets and the
root layout reads — Server Components have no `usePathname()`), so the
two chrome systems never double up.

**Provider-side reads never touch `farm_jobs.location` directly.** RLS
alone can't hide one column while allowing the row — see "Marketplace
data model" for why discovery goes through `SECURITY DEFINER` functions
(`discover_jobs`, `get_offers_for_job`, `get_my_offers`, all in
`src/features/{jobs,provider}/queries.ts`) that explicitly choose safe
columns instead. `discover_jobs(p_job_id?, p_max_distance_km?)` doubles
as both the list feed and the single-job detail fetch pre-offer, to keep
that logic in one place. Once a `job_assignments` row exists, RLS grants
the assigned provider (and the job owner, the other way) real direct
table access, including exact location/phone — that's a deliberate,
narrow RLS addition (0011, 0016), not a function, because full access is
exactly correct at that point.

**Multi-table writes are atomic RPCs, not sequential client inserts** —
`create_farm_job`, `submit_job_offer`, `accept_job_offer` (0014). The
latter two are `SECURITY DEFINER` because submitting/accepting needs to
flip `farm_jobs.status`, which belongs to the *other* party; each
re-checks authorization internally before writing (see the migration's
comments). `create_farm_job` is plain `SECURITY INVOKER` — inserting
your own data needs no elevation, just atomicity.

**Job creation** (`src/features/jobs/components/create-job-wizard.tsx`)
is a client-only multi-step wizard — all draft state lives in local
React state and nothing is written to the database until the final
"Post Job" submit calls `create_farm_job`. There's no persisted
`draft` row for an abandoned wizard; the client state *is* the draft for
this phase.

**Location capture** uses the browser Geolocation API only (`"Use my
current location"`, in both the job wizard and the provider profile
form) — no geocoding/maps dependency. If a user skips it, the relevant
`geography` column stays null and that record just doesn't participate
in distance sorting/display; nothing else breaks.

## Notifications (Phase 3C)

**One table, not one per event type.** `public.notifications` (0017) has
a `type` text column constrained by a `check` to a fixed set
(`offer_received`, `offer_accepted`, `system`), plus generic
`related_entity_type`/`related_entity_id` columns instead of per-event
foreign keys. Adding a future event type is a one-line `check`
constraint change, not a new table or a client-side union type — see
`src/types/marketplace.ts`'s `NotificationType`.

**Clients cannot create notifications, full stop.** RLS on the table
grants only `select` and `update`, both scoped to
`recipient_id = auth.uid()` — there is no `insert` or `delete` policy at
any privilege level, so a row can never be created through PostgREST no
matter what a client sends. The only way a row comes into existence is
`create_notification(...)`, a `SECURITY DEFINER` function with
`EXECUTE` revoked from `anon` *and* `authenticated` (0017) — it is only
reachable from inside another `SECURITY DEFINER` function already
running as the table owner, i.e. `submit_job_offer` and
`accept_job_offer`.

**This forced `accept_job_offer` to become `SECURITY DEFINER` too**
(0018) — it was `SECURITY INVOKER` since 0014, which worked fine when
its only job was inserting `job_assignments` under RLS. Once it needed
to call the locked-down `create_notification`, INVOKER meant the call
ran as the calling farmer, who (correctly) has no grant on that
function, and every accept failed with a permission error. Making it
DEFINER meant the `job_assignments` "insertable by job owner" RLS check
it had relied on no longer ran, so the function now re-checks
`farm_jobs.created_by = auth.uid()` explicitly before writing anything
— the same "SECURITY DEFINER re-checks authorization inside the
function body" pattern `submit_job_offer` already used. Both
`submit_job_offer` and `accept_job_offer` being `SECURITY DEFINER` and
callable by `authenticated` is an intentional, expected Supabase
advisor finding (same category as the `owns_*`/discovery-RPC exposures
documented above), not a gap to fix.

**Event generation lives inside the write RPCs, not the client.**
`submit_job_offer` notifies the job's farmer (`offer_received`);
`accept_job_offer` notifies the accepted provider (`offer_accepted`).
Both resolve the recipient and a human-readable title/body from data
already in scope (job title, provider business name) and call
`create_notification` with `related_entity_type = 'job'` — there is no
notification-sending code anywhere in `src/`.

**Unread count is fetched server-side, not polled.** `/app/layout.tsx`
calls `getUnreadNotificationCount` once per request and passes it into
`AppShell` as a prop; the bell badge updates on the next navigation or
revalidation, not in real time. This is deliberate — no client-side
polling loop or realtime subscription that depends on a browser tab
staying open. `revalidatePath` on the relevant routes after
mark-as-read keeps it from feeling stale in normal use.

**Click-through has no route for a provider-side confirmed job.**
`discover_jobs` (the RPC backing `/app/provider/jobs/[jobId]`) only
returns `posted`-family jobs, so an `offer_accepted` notification can't
deep-link to a per-job provider page — `notificationHref` in
`src/features/notifications/queries.ts` routes it to `/app/provider`
(the Work list) instead. `offer_received` deep-links to
`/app/jobs/[jobId]` normally, since the farmer's job detail page has no
such gap.

**The provider nav needed a fifth item it didn't have.** Before this
phase, `PROVIDER_NAV` in `app-shell.tsx` had no notifications entry at
all — providers received notifications with no in-app way to reach
`/app/notifications`. Adding the link exposed a second, sharper bug:
`AppShell` picked farmer vs. provider nav purely from
`pathname.startsWith("/app/provider")`, so a provider-only account
visiting the (shared, non-`/app/provider/**`) notifications route would
have silently flipped to the farmer nav. The check is now
`isProvider && (!isFarmer || pathname.startsWith("/app/provider"))` — a
provider-only account always gets the provider nav; dual-role and
farmer-only accounts keep the previous path-based behavior.

**A provider-only account could post a farm job.** Found while
end-to-end testing the notification flow with two fresh test accounts:
`/app/jobs/new` had no role guard — unlike `/app/provider/**`, which
`layout.tsx` redirects away from non-providers — and `create_farm_job`
never checked `profiles.is_farmer` either, so hitting the route
directly let a provider-only account post a job under its own id. RLS
still scoped the resulting rows correctly (nothing leaked to the wrong
party), but a provider appearing as a job's farmer is a data-integrity
bug, not just a missing redirect. Fixed at both layers (0019): the page
redirects non-farmers, and `create_farm_job` now raises if
`auth.uid()` isn't a farmer — the same belt-and-suspenders pattern as
the offer RPCs.

## Marketplace discovery, filtering, and trust (Phase 3D)

**Filters and sorting live inside `discover_jobs()`, not a second
endpoint or client-side filtering.** The RPC already had to be the
column allowlist for provider-side job browsing (see "Marketplace UI"
above) — extending its parameters keeps that the one place deciding
both *what* a provider may see and *which* rows match their filters,
rather than opening a second code path that could drift out of sync
with the privacy rules. All new parameters (`p_service_id`,
`p_date_from`/`p_date_to`, `p_budget_min`/`p_budget_max`, `p_sort`)
default to "no filter", and adding them required dropping the old
2-arg function first (0020) — `CREATE OR REPLACE` on a function with a
different parameter list creates an overload rather than replacing it,
which would have made `rpc("discover_jobs", {...})` ambiguous for
callers passing only the original two arguments.

**Filters are URL search params, parsed server-side.**
`/app/provider/jobs` reads `searchParams` in the page component,
`parseJobFilters` (`src/features/provider/job-filters.ts`) validates
each value against a fixed option list (an unrecognized value silently
falls back to the default rather than erroring), and
`resolveDiscoverJobsParams` converts UI values (a distance preset, a
date preset, a budget bucket) into the plain range values the RPC
takes. `JobFilters` (client component) only ever pushes a new URL via
`router.push` — it holds no filter state of its own — so the result
list is always whatever the server rendered for that exact URL: refresh
-safe, back/forward-safe, shareable. "This week" is a rolling 7-day
window from today, not a calendar Mon–Sun range — simpler and more
useful for farm work.

**Sorting is still plain SQL ordering, not a matching algorithm** — the
`p_sort` values (`nearest`, `newest`, `budget`, `earliest`) each guard
one `ORDER BY` key with a `CASE`, so an inactive sort mode's key is
`null` for every row and drops out without affecting order. The default
`'recommended'` (and the final tiebreak for every other mode) is
unchanged from Phase 3B: matching service first, then nearest, then
soonest, then newest.

**Budget filtering treats an unset budget as "always matches", not
excluded.** A job with `budget_min`/`budget_max` both null (the farmer
picked "I'm flexible on price") can't be said to violate a budget range
we don't know it's outside of, so the overlap test only excludes a job
when it has an actual stated bound that falls outside the filter.

**New discover_jobs columns are read-only conveniences, not new
privacy surface**: `updated_at` (posted vs. updated), `my_offer_status`
(has the calling provider already offered, and what happened), and
`offer_count` (a bare count, never *who* — a provider gauges
competition without seeing competitors) are all derived from tables the
provider could already reach through other allowed paths; nothing new
is exposed here that RLS wasn't already going to allow.
`get_offers_for_job` (0021) similarly grew a `service_names` column
(the offering provider's own active services) for the same reason
`discover_jobs` already had one — it's aggregated from
`provider_services`/`services`, both already visible to whoever is
allowed to call the function.

**Provider trust signals are presentation over existing columns, never
new ones.** `ProviderTrustSummary`
(`src/features/provider/components/provider-trust-summary.tsx`) reads
only `rating_average`/`rating_count`/`completed_jobs_count`/
`verification_status`, already on `provider_profiles` since Phase 3A —
there is no review-submission flow and nothing computes or fabricates a
score. A provider with `rating_count = 0` gets "New provider" instead
of a fake zero-star display; `verification_status !== 'verified'` gets
no badge at all rather than a negative "Unverified" one. The same
component (in `compact` size) backs the desktop offer-comparison table
(`offer-comparison-table.tsx`, `md:` and up) and the mobile stacked
`OfferCard`s (below `md:`) — one trust-signal implementation, two
layouts, rather than a duplicated one.

**Job status now has one icon mapping used everywhere it's shown** —
`JOB_STATUS_ICON` (`job-status-badge.tsx`) backs both the small
`JobStatusBadge` (used in job/offer lists) and the larger `JobStatusLine`
(the prominent status line at the top of a job detail page), so status
is never communicated by badge color alone and the two never drift
apart into different icons for the same status.

## Job lifecycle (Phase 4)

**farm_jobs.status already allowed the full lifecycle since 0007** — its
`CHECK` constraint has always included `in_progress`/`completed`/
`cancelled` alongside the earlier states, so this phase needed no enum
widening, just the timestamp columns (`started_at`, `completed_at`,
`cancelled_at`, `cancelled_by`, `cancellation_reason`, all on
`farm_jobs`, 0022) and the RPC that actually enforces the transitions.

**The state machine** (the only five legal `(from_status, action,
actor)` combinations `transition_job_status()` accepts):

| From | Action | To | Who |
|---|---|---|---|
| `confirmed` | `start` | `in_progress` | assigned provider only |
| `confirmed` | `complete` | `completed` | farmer only |
| `in_progress` | `complete` | `completed` | farmer **or** assigned provider |
| `confirmed` | `cancel` | `cancelled` | farmer only |
| `in_progress` | `cancel` | `cancelled` | farmer only |

Everything else is rejected — every pre-confirmation state
(`draft`/`posted`/`matching`/`offers_received`), both terminal states
(`completed`/`cancelled`) as a *source*, and any actor not covered
above. A farmer can complete a job directly from `confirmed` without it
ever passing through `in_progress` (the provider may simply never have
clicked Start) — a provider cannot, since starting is the one signal
they've actually begun. A provider was deliberately **not** given a
cancel action: Part B of the phase brief named cancellation as a farmer
capability only, and giving a provider a way to unilaterally end a
confirmed engagement is a materially different, un-requested feature
(closer to "withdraw," which doesn't exist post-assignment) rather than
a small extension of what was asked.

**job_assignments.status is intentionally not part of this lifecycle.**
It stays at `'assigned'` — the value `accept_job_offer` already sets —
for the rest of the assignment's life, including through
`in_progress`/`completed`/`cancelled`. Two things depend on it staying
in `('assigned', 'confirmed')`: the "one active assignment per job"
partial unique index (0007) and the privacy-unlock checks
(`is_assigned_provider_for_job`, the `profiles` counterparty policy,
both 0011) that grant exact location/phone once a provider is assigned.
Leaving it untouched keeps that unlock correctly "on" for the rest of
the job's life — including a cancelled job, where both parties
reasonably still need each other's contact info as history — without
introducing a second status vocabulary that could drift from
`farm_jobs.status`. The one place that used to read
`job_assignments.status` for lifecycle purposes (the provider Work
page's "what's active" filter) now reads the joined `farm_jobs.status`
instead.

**transition_job_status(p_job_id, p_action, p_cancellation_reason)** is
`SECURITY DEFINER` (like `submit_job_offer`/`accept_job_offer`) because
the provider-side actions (`start`, and provider-side `complete`) are
not the job owner and have no `farm_jobs` `UPDATE` grant under the
existing owner-only RLS policy. It re-derives authorization from
scratch on every call — `v_is_owner` from `farm_jobs.created_by`,
`v_is_provider` from an `exists` check against `job_assignments` scoped
to *this* job and an active assignment status — never trusts anything
the client claims about who it is. Client-supplied timestamps are
impossible by construction: `started_at`/`completed_at`/`cancelled_at`
are always `now()`, `cancelled_by` is always `auth.uid()`, set inside
the function, not accepted as parameters.

**Concurrency**: `select ... for update` takes a row lock on the job as
the first thing the function does, so a second concurrent call blocks
until the first transaction commits, then re-reads the now-current
status under its own lock — it can never act on stale state. The
subsequent `update ... where status = <status read under the lock>` is
a belt-and-suspenders guard restating that assumption; the lock alone
already prevents the race. Tested directly: calling `start` twice in a
row correctly rejects the second call ("job is not in a startable
state"), and a `start` immediately followed by a `cancel` on the same
job succeeds as two sequential, individually-valid transitions with a
fully consistent final row (`started_at` preserved, `cancelled_at`/
`cancelled_by`/`cancellation_reason` set, `completed_at` still null) —
there is no interleaving that leaves partial state.

**Pending-offer behavior after confirmation** (Part O decision):
`accept_job_offer` now also runs
`update job_offers set status = 'rejected' where job_id = ... and id <>
p_offer_id and status = 'pending'` in the same transaction as creating
the assignment. Every other still-pending offer on that job is
deterministically rejected the moment one is accepted, rather than left
dangling forever or requiring a separate cleanup job. Verified directly:
two competing pending offers on one job, accepting one, confirms the
other flips to `'rejected'` in the same request.

**Cancellation reasons** are a fixed client-side list
(`CANCELLATION_REASONS` in `src/types/marketplace.ts`: Plans changed /
Provider unavailable / Weather conditions / Work no longer needed /
Other), stored as plain text in `cancellation_reason` — no separate
reasons table. Selecting "Other" reveals an optional free-text field
whose content is prefixed (`Other: ...`) before being sent, so the
stored reason is still a single self-describing string.

**Notifications**: three new types (`job_started`, `job_completed`,
`job_cancelled`, added to `notifications`'s `type` `CHECK` constraint
alongside the existing three) are generated inside
`transition_job_status` as it makes the change, on the existing
`create_notification` path (see "Notifications" above) — no new
notification-sending code outside the RPC layer. Four of the five
notification-worthy transitions have an unambiguous recipient side by
construction (`job_started` and a provider-triggered `job_completed` go
to the farmer; `job_cancelled` and a farmer-triggered `job_completed`
go to the provider). `job_completed` is the one type either side can
receive, so `notificationHref` takes an optional `isFarmerForJob` flag
that the notifications page resolves with one small batched query
(`farm_jobs` filtered to `created_by = auth.uid()` for just the
ambiguous job ids) rather than guessing. Whichever URL is picked, the
destination page enforces its own authorization independently (RLS on
the farmer route, an assignment check on the provider route) — a wrong
guess 404s, it never leaks a job.

**The provider-side job detail route now has two branches.**
`/app/provider/jobs/[jobId]` first tries `discover_jobs` (the
open/pre-offer view); if that returns nothing — because the job has
moved past `confirmed` and left `discover_jobs`'s status filter — it
falls back to a new query, `getMyAssignmentForJob`, which returns this
job's assignment (RLS-scoped to the job owner or the assigned provider,
same as always) with the full `farm_jobs` row and farmer contact. This
closed a real gap from Phase 3C: an `offer_accepted` notification had
nowhere specific to link a provider to before this phase, since the
confirmed job was invisible to every provider-facing query. It now
routes straight to the job.

**Job history** is derived entirely from the existing timestamp/
cancellation columns (`JobHistory` component) — not a separate
event-log table. With at most three possible events per job
(started, completed, cancelled) and no requirement to record multiple
occurrences of the same event (a job is never un-started or
un-completed), the existing columns already hold everything the UI
needs; a genuine append-only audit trail would only earn its
complexity if a future phase needed multiple events of the same kind
(e.g. reschedules).

## Trust & Reputation (Phase 5)

**Review model.** One new table, `reviews`, carries a review from a
completed job rather than from two bare user ids:

```
reviews (id, job_id, assignment_id, reviewer_id, reviewee_id,
         rating 1-5, comment ≤500 chars, created_at)
```

`job_id` and `assignment_id` are both stored (not derivable from each
other alone without a join) so a review is directly queryable either
way and RLS/eligibility checks don't need an extra hop. No `direction`
column exists: with exactly two possible reviewers per assignment (the
job's farmer and its assigned provider), the unique constraint
`(assignment_id, reviewer_id)` already means "one review per reviewer
per assignment," which is equivalent to "one review per direction."
`reviewer_id`/`reviewee_id` reference `profiles`, not `provider_profiles`
— a farmer has no provider row, so reviewing a provider means storing
the provider's `profile_id`, not their `provider_profiles.id`.

**Eligibility is enforced entirely inside `submit_review(p_assignment_id,
p_rating, p_comment)`**, a `SECURITY DEFINER` RPC — never by RLS on
`reviews` (there is no `INSERT` policy on the table at all; every
`INSERT` must go through this function). It independently re-derives,
from the assignment and job rows, everything the client could otherwise
lie about:

- the assignment exists and its job is `farm_jobs.status = 'completed'`
  (not `job_assignments.status`, which — per the Phase 4 decision above
  — stays `'assigned'` forever and carries no lifecycle information)
- the caller is either the job's `created_by` (farmer) or the
  assignment's provider's `profile_id` — anyone else is rejected
- the reviewee is deterministically the *other* party (farmer calling
  → reviewee is the provider; provider calling → reviewee is the
  farmer), never a client-supplied id
- rating is an integer 1-5 and comment is ≤500 chars, checked in the
  function *and* again by the table's `CHECK` constraints as a second
  layer
- one review per (assignment, reviewer) — the second attempt hits the
  unique constraint, caught and re-raised as "you have already
  reviewed this job"

`created_at`/`job_id`/`assignment_id`/`reviewer_id`/`reviewee_id` are
all set server-side; the client sends only `assignment_id`, `rating`,
`comment`.

**Self-review defense in depth.** Nothing in this phase stops a user
from also holding a `provider_profiles` row and being offered/accepted
on their own job (that gap predates Phase 5 and is out of scope for it
to close). `submit_review` would compute `reviewee_id = v_caller` in
that case, so a table-level `CHECK (reviewer_id <> reviewee_id)`
constraint exists specifically to catch it — verified directly: a
farmer holding their own provider profile, self-assigned and completed,
is rejected with a `CHECK` violation when attempting to review "the
other side." The generic error-mapping fallback in the server action
(anything not explicitly matched → "Could not submit your review.")
means this still never surfaces a raw constraint-violation message to
the browser.

**Rating aggregation is fully database-controlled.** An `AFTER INSERT
ON reviews` trigger (`update_provider_rating_aggregate`) recomputes
`provider_profiles.rating_average`/`rating_count` from a full `count`/
`avg` over all of that provider's reviews — not an incremental
`+= 1` — specifically to avoid floating-point drift accumulating over
many inserts; the full recount is cheap at review-table volumes and
correctness mattered more than shaving a read. `rating_average` is
rounded to 2 decimal places at write time (`round(avg(rating)::numeric,
2)`) so display never needs client-side rounding logic, matching what
`provider_profiles.rating_average numeric(3,2)` (0004) already only
had room for. A second `AFTER UPDATE OF status ON farm_jobs` trigger
(`increment_provider_completed_jobs`) increments
`provider_profiles.completed_jobs_count` on every transition *to*
`'completed'`. This fixes a real pre-existing gap found by grepping the
codebase before writing it: **nothing had ever written to
`completed_jobs_count` in any prior phase** — the column existed since
0004, was read everywhere provider trust is displayed, but was always
`0`. Both trigger functions are `SECURITY DEFINER` with `EXECUTE`
explicitly revoked from `public`/`anon`/`authenticated` — PostgREST
otherwise auto-exposes any public-schema function as a callable RPC,
and a no-op-when-called-directly trigger function has no business being
a public endpoint even though calling it directly is harmless (it only
ever reads `NEW`, which doesn't exist outside a real trigger firing).

**Reputation columns are further protected against direct writes.**
Security testing surfaced that the pre-existing "provider profiles are
updatable by owner" policy (0004) has no column restriction, so a
provider could `PATCH /rest/v1/provider_profiles` and set their own
`rating_average`/`rating_count`/`completed_jobs_count` to anything,
completely bypassing both triggers above. Fixed with a `BEFORE UPDATE`
trigger (`protect_provider_reputation_columns`) that resets those three
columns to their `OLD` values whenever `pg_trigger_depth() <= 1` — i.e.
whenever the `UPDATE` originated directly from a client statement
rather than from inside another trigger's cascade. The two aggregate
triggers above call their `UPDATE` from inside an `AFTER INSERT`/`AFTER
UPDATE` trigger body, so `pg_trigger_depth()` is 2+ there and their
writes pass through untouched; a direct client `PATCH` is depth 1 and
gets silently reverted. Verified live: a `PATCH` attempting
`rating_count: 9999, completed_jobs_count: 9999` returns `200` (RLS
still permits the row-level update) but the response body shows the
unchanged, trigger-computed values — the attacker gets no error and no
effect, which is the correct outcome for "don't let the client know
exactly what's being blocked or how."

**Immutability.** Reviews have no `UPDATE` or `DELETE` policy at all —
the same pattern used for `notifications` (0017). Once inserted, a
review cannot be changed or removed by any role short of direct
database access. This was a deliberate choice, not an oversight: a
correction mechanism (edit window, dispute flow, moderation) is a
materially bigger feature than this phase's "fundamental integrity"
scope, and shipping one-way reviews now doesn't foreclose adding a
correction path later — it only means the first version has no way to
fix a fat-fingered rating, which is an acceptable trade for an investor
demo. Verified directly: a `PATCH`/`DELETE` against `/reviews` as the
review's own author returns `200` with an empty array (RLS silently
filters to zero matched rows) — not an error, but also no effect; the
review is unchanged.

**Privacy.** The public-facing review list (`get_provider_reviews`,
`SECURITY DEFINER`, `authenticated`-only) never returns
`reviewer_id`, raw `display_name`, phone, or any other identifying
column — it computes a `reviewer_label` in SQL before the row ever
leaves the database: `"First L."` (first word of `display_name` plus
the first letter of the second word), the single word alone if there's
no second word, or `"A FarmConnect user"` if `display_name` is null or
blank. There is no code path where a full name, id, or contact detail
reaches this endpoint's response. The table's own `SELECT` policy is
separately scoped: a signed-in user sees a review if they're the
reviewer or reviewee (so they can always see their own activity) or if
the reviewee is a `provider_profiles` row (so any signed-in marketplace
participant can browse a provider's public reviews) — an anonymous
visitor sees none, and a farmer's reviews are not independently
browsable by strangers the way a provider's are.

**Farmer reputation has no stored aggregate.** No columns were added
to `profiles` for a farmer-side rating average or review count. There
is currently no farmer-facing profile screen that could display one,
and building one solely to host a number nobody asked to see would be
exactly the kind of overbuilding this phase was scoped against. The
data model doesn't block adding it later — `reviews.reviewee_id`
already captures every provider→farmer review — a future phase would
only need to add the two aggregate columns and a third trigger
mirroring `update_provider_rating_aggregate`, keyed on `reviewee_id`
matching a `profiles` row that isn't a provider.

**UX.** `ReviewForm` renders on the completed-job detail page (both the
farmer's `/app/jobs/[jobId]` and the provider's
`/app/provider/jobs/[jobId]`) directly below the lifecycle actions,
conditioned on `job.status === 'completed'` — there's no separate
"leave a review" page to navigate to. Star selection
(`StarRatingInput`) uses five native `<input type="radio" name="rating">`
elements, each visually hidden (`sr-only`) inside its own `<label>`
wrapping a Lucide star icon; this is a deliberate choice to get
keyboard operability (Tab into the group, arrow keys move the
selection) and screen-reader semantics (each label has an `sr-only`
"N stars" name) from native browser radio-group behavior rather than a
hand-rolled `role="radiogroup"`/keydown implementation — verified
directly with real arrow-key presses in a live session, confirming
both focus and the checked value move together. Whether the current
user already reviewed a given assignment is resolved server-side
(`getMyReviewForAssignment`, a plain `select` scoped by RLS to the
caller's own reviews) and passed into the page as `existingReview`; the
form renders a "✓ Review submitted" card with the stored stars and
comment instead of the input whenever that value is non-null, so the
already-reviewed state can never be spoofed by client-side state
alone. No new notification type was added for "please review" — the
existing `job_completed` notification from Phase 4 already routes both
parties to the exact job detail page the review form lives on, so
adding a second notification for the same event would be pure spam
without adding a new destination.

**Reviewed live via the browser**, not just via the RPC directly: full
star click interaction, keyboard rating selection, comment entry with
the 500-char counter, submission, and the resulting "✓ Review
submitted" card, at both tablet (768px) and mobile (375px, confirmed
zero horizontal overflow) widths — plus the provider-profile reviews
list and the offer-comparison trust column at the same breakpoints.

**Security regression testing** (all 16 required attack scenarios,
against real test accounts and RPC/REST calls, not just code review):

| # | Attack | Result |
|---|---|---|
| 1 | Farmer reviews assigned provider after completion | ✅ allowed |
| 2 | Provider reviews assigned farmer after completion | ✅ allowed |
| 3 | Farmer reviews before completion | ❌ rejected — "job is not completed yet" |
| 4 | Provider reviews before completion | ❌ rejected — "job is not completed yet" |
| 5 | Farmer reviews an unrelated provider/job | ❌ rejected — "not authorized" |
| 6 | Provider reviews an unrelated farmer/job | ❌ rejected — "not authorized" |
| 7 | Self-review (dual-role self-assigned job) | ❌ rejected — `reviews_no_self_review` `CHECK` |
| 8 | Duplicate review, same assignment/direction | ❌ rejected — unique-constraint → "already reviewed" |
| 9 | Anonymous submits a review | ❌ rejected — `401`, `EXECUTE` not granted to `anon` |
| 10/11 | Direct `POST /reviews` with a forged `reviewer_id`/`reviewee_id` | ❌ rejected — `403`, no `INSERT` policy exists |
| 12 | Direct `PATCH` of `provider_profiles` rating/count columns | ❌ blocked — `200` returned but values silently reverted by trigger |
| 13 | `PATCH /reviews` to alter a review | ❌ no-op — `200`, empty result, row unchanged (no `UPDATE` policy) |
| 14 | `DELETE /reviews` to remove a review | ❌ no-op — `200`, empty result, row still present (no `DELETE` policy) |
| 15 | Rating of `0` or `6` | ❌ rejected — "rating must be between 1 and 5" |
| 16 | Comment over 500 characters | ❌ rejected — "comment is too long" |

**Advisors.** `function_search_path_mutable` was raised against the new
`protect_provider_reputation_columns` trigger function (missing `set
search_path = public`, unlike every other function this phase) and
fixed immediately. The unindexed-FK finding against `reviews.reviewer_id`
was fixed with an index. Remaining findings after both fixes are
pre-existing and out of scope for this phase: the marketplace's
long-standing intentionally-public RPCs (`discover_jobs`,
`accept_job_offer`, etc., all deliberately callable by `anon`/
`authenticated`, unchanged since earlier phases), leaked-password
protection (an account-security toggle unrelated to reviews), and
`unused_index` (expected `INFO`-level noise on a low-traffic dev
project — flags the FK indexes this phase intentionally added, among
others).

**Deferred / explicitly out of scope for this phase**: any review
edit/dispute/correction flow, review moderation or reporting, fake- or
bot-review detection beyond the structural anti-gaming checks above,
a farmer-facing profile/reputation screen, weighting or decay in the
rating average (it's a flat mean), and fixing the pre-existing gap that
lets a user hold both a farmer and a provider identity and transact
with themselves (caught defensively by the self-review `CHECK`
constraint, but the underlying offer/assignment path that allows a
provider to bid on their own job is unchanged).

## Investor-grade product polish (Phase 6)

This phase found and fixed real defects rather than restyling working
UI — the audit was screen-by-screen in a live browser, not a code read,
which is what surfaced most of these (none were visible from source
alone).

**The entire site was rendering in the browser's default serif font,
not Geist Sans.** `globals.css`'s `@theme inline` block wired Tailwind's
`font-sans` utility to `var(--font-sans)` — a custom property that was
never defined anywhere else, so it was self-referential and invalid.
`html { @apply font-sans; }` then resolved to nothing, and every element
on every page fell back to the browser's UA default (Times New Roman).
Fixed by pointing it at the actual next/font variable:
`--font-sans: var(--font-geist-sans);`. This is the single highest-impact
fix in this phase — it affected literally every screen.

**A brand-new user's first look at their dashboard could be broken
chrome.** The root layout decided marketing-vs-`/app` chrome by reading
a `pathname` request header that `src/proxy.ts` set — but it set it on
the outgoing *response* (`response.headers.set(...)`), which a Server
Component's `headers()` call never sees (that reads incoming request
headers). This happened to look correct on a hard page load, because a
fresh request re-runs the whole chain, but the App Router reuses an
already-rendered root layout across client-side navigations, so the
`inApp` value it computed on the *previous* page stuck around. The
sharpest case: completing onboarding redirects to `/app`, a client-side
transition from `/onboarding` (`inApp = false`) — so the first-ever
dashboard view was wrapped in the public marketing header and bottom
tab bar instead of `AppShell`'s own navigation. Fixed with
`ChromeSwitcher` (`components/layout/chrome-switcher.tsx`), a client
component using `usePathname()`, which is reactive to client-side
navigation in both directions; `src/proxy.ts` no longer sets or needs
the header at all.

**Onboarding lost your answers if any single field failed validation.**
React resets uncontrolled form fields once a form action *completes* —
success or a rejected business-logic result alike, since from React's
side both are just "the action finished." Verified directly: submitting
the onboarding form with a filled-in display name, phone, and location
but no role checkbox checked came back with all three text fields wiped
to blank, not just the actually-invalid checkbox group. `displayName`
already avoided this via `defaultValue` (echoing the existing profile
value); `phone`/`location` had none. Fixed by having
`completeOnboardingAction` echo every submitted field back in its error
state (`AuthFormState.values`, a small addition available to any auth
form that needs it) and having the form use those as
`defaultValue`/`defaultChecked`. This pattern is worth knowing about for
any other form built directly on `useActionState` with uncontrolled
inputs — `submit-offer-form.tsx` has the same shape and was left
alone this phase since its failure mode (a duplicate-offer rejection)
is materially rarer than a first-time onboarding checkbox miss.

**Reusable pattern**: `MetricCard`
(`features/marketplace/components/metric-card.tsx`) replaces a `StatTile`
that had been independently copy-pasted into both the farmer and
provider dashboards with identical markup. Every number it's given must
still come from a real query — this phase didn't touch that; it just
removed the duplication.

**Provider dashboard gained a primary CTA.** `/app/provider` (the
"Work" page) had stats and a confirmed-work list but no obvious way to
actually go find a job — "Available Jobs" was a bare number, not a
link. Added a `Find Work` button in the same treatment as the farmer
dashboard's `Post a Job`, linking to `/app/provider/jobs`.

**Public site navigation was doubled up.** `/`, `/farmer`, and
`/provider` rendered *both* `SiteHeader` (with a `Sheet` menu on mobile
containing every nav destination plus log in/out) *and* a separate
fixed bottom tab bar (`MobileTabBar`) repeating a subset of the same
three destinations. Removed `MobileTabBar` entirely — one nav mechanism
for a three-page marketing site is enough, and the header's menu is a
strict superset of what the tab bar offered. The file
(`components/layout/mobile-tab-bar.tsx`) is deleted, not just
unmounted, since nothing else referenced it.

**Auth pages had a large dead gap between the card and the page
bottom** on any viewport taller than the form itself — `AuthShell` was a
top-anchored flex column with no vertical centering. Given
`min-h-[70dvh]` and `justify-center` so the card sits in the middle of
the available height instead of pinned to the top with empty space
below.

**Demo data / catalogue completeness.** The `service_categories` seed
(0004) has always included "Transportation" as a category with *zero*
services under it — a real dead end in the job-posting wizard: picking
it showed "No services in this category yet." with no way to continue.
This is catalogue/reference data, not marketplace activity — no
different in kind from the other five categories' seeded services — so
filling it in isn't the fabricated-traction/fake-data pattern this
project avoids elsewhere. Added two real service types
(`0029_transportation_services.sql`): Produce Transport, Equipment
Transport.

**Demo/test account convention** (unchanged from earlier phases,
recorded here since Phase 6 is a good place to make it explicit):
accounts are created directly via `insert into auth.users (...)` with
`crypt(password, gen_salt('bf'))` and `email_confirmed_at = now()`,
bypassing GoTrue's email flow — normal signup hits Supabase's email
rate limit quickly under repeated testing. This requires setting
`email_change`/`email_change_token_new`/`email_change_token_current`/
`phone_change`/`phone_change_token`/`reauthentication_token` to `''`
rather than leaving them `NULL` — GoTrue's Go code scans these columns
into non-nullable strings and returns a bare "Database error querying
schema" (500) on the next password-grant token request if any are
`NULL`. Every test account created this way is deleted at the end of
the session (auth.users, profiles, provider_profiles + their owned
rows, farm_jobs and everything chained from them, notifications) —
verified empty afterward. There is no separate, permanent "demo
dataset" seeded into this project; a live demo is expected to use two
freshly created accounts walked through the real flow, which is also
what this phase's own testing did.

**Verified live in the browser, not just read as code**: the full
farmer→provider flow (post a job, receive and accept a real offer,
start, complete, leave a review) re-run end-to-end after the font and
chrome fixes, at 375px, 768px, and 1440px; keyboard focus visibility
spot-checked on the login page (Tailwind `focus-visible:ring-*`, not
relying on the browser default outline, is visible on tab). No RLS
policy, RPC, or trigger was touched this phase — every fix here is UI,
routing/chrome, or additive catalogue data — so no new security testing
beyond confirming that `services`/`service_categories` still carry only
the pre-existing "publicly readable, no end-user write policy" RLS
shape after the new rows were inserted.

## Marketplace Intelligence & Matching (Phase 7)

**Purpose.** Before this phase, `discover_jobs()` was filtering
(job status, distance radius, service, date, budget — all hard
`WHERE` clauses) plus deterministic tiebreak sorting (a `CASE`-based
`ORDER BY`: matching-service first, then nearest, then soonest, then
newest). `get_offers_for_job()` had no ranking at all —
`created_at desc` only. Neither considered availability, machine/
worker capability, workload conflicts, or reputation. This phase adds
those signals as **deterministic, explainable SQL** — never a black-box
score and never AI/ML. Calling the result "matching intelligence" is a
product-framing choice, not a technical one: every fact behind it is a
named, independently-testable boolean or ratio, traceable to a real
column.

**Architecture.** Seven small `SECURITY DEFINER` helper functions,
each computing ONE fact about a `(provider_id, job_id)` pair:

- `provider_service_match_ratio` — fraction of the job's required
  services (`job_services`) the provider actively offers
  (`provider_services`, active only). Jobs today always have exactly
  one service row, but the function handles N generically since the
  schema allows more.
- `provider_available_for_schedule` — does the job's `scheduled_start`
  fall inside one of the provider's recurring weekly
  `provider_availability` windows (converted to `Asia/Kolkata` local
  time)? Returns `null` (unknown) when the job has no schedule or the
  provider has set no availability at all — an unfilled section is
  never read as a negative.
- `provider_has_workload_conflict` — does the provider already have a
  `confirmed`/`in_progress` job (via `job_assignments`) whose
  scheduled window (`tstzrange` overlap) conflicts with this one? Only
  asserts a conflict when both jobs have explicit start/end times.
- `provider_has_matching_machine` — `null` (not applicable) if the job
  has no `job_machine_requirements`; otherwise true only if EVERY
  requirement row has a matching active machine, matched by normalized
  (lowercased/trimmed) `machine_type` text comparison OR by
  `machine_services` linking the machine to the job's required
  service.
- `provider_has_matching_workers` — `null` if the job has no
  `job_worker_requirements`; otherwise a pure capacity check (active
  `workers` count or a single active team's `member_count` meets
  `worker_count`) — no skill-matching, since
  `job_worker_requirements.skill_requirement` is free text with no
  reliable structure.
- `provider_budget_fit` — `null` unless the job has a stated budget
  AND the provider has a stated price range
  (`provider_services.min_price/max_price`) for the required service;
  otherwise a plain range-overlap test. Never a guaranteed final price
  — offers are still negotiated.
- `provider_trust_score` — pure math, no table access; see "Reputation"
  below.

Plus one pure combinator, `job_match_tier(...)`, folding the above into
`'strong'` / `'good'` / `'fair'` / `null`. None of these eight
functions are meant to be called directly via PostgREST — `EXECUTE` is
revoked from `anon`/`authenticated` on all of them (same lockdown
pattern as the Phase 5 trigger functions), verified live: a direct
`POST /rest/v1/rpc/provider_has_matching_machine` as an authenticated
user returns `403 permission denied`. They are internal building
blocks, callable only from within `discover_jobs()` and
`get_offers_for_job()`, which are themselves already-authorized
`SECURITY DEFINER` entry points.

**`discover_jobs()`** computes every fact via a `scored` CTE (each
helper called once per row, not per reference) against the *calling*
provider's own data — a pure self-check, via the same `me as (...
where profile_id = auth.uid())` pattern the function already used for
`has_matching_service`. No cross-user read was added. The
`'recommended'` sort (unchanged parameter value, so no existing filter
UI broke) now orders by `match_tier` first (strong → good → fair → no
match), then distance, then schedule, then recency — replacing the
old "matching-service-first" tier with a richer one. The UI label
changed from "Recommended" to **"Best matches"** — the other four
sort modes (nearest/newest/budget/earliest) are untouched.

**`get_offers_for_job()`** computes the same facts for each *offering*
provider against the one job the caller (the farmer) owns — still only
derived booleans/aggregates about that provider, never raw
`machines`/`workers` rows, exactly matching the pre-existing precedent
of returning `service_names` (aggregated) instead of raw
`provider_services`. Default order changed from plain `created_at desc`
to: accepted offer first, then `match_tier`, then `provider_trust_score`
descending, then distance, then recency. **Verified live that this is
not "sort by price":** a test provider offering ₹4,200 with a strong
match (service + machine + workers + schedule + budget all satisfied)
ranked above a competitor offering ₹3,200 with a fair match (four of
six signals negative) — the cheaper, weaker-matched offer ranked
second despite being submitted first.

**Reputation — Bayesian-damped, not a raw average.**
`provider_trust_score(rating_average, rating_count)` computes
`(rating_average · rating_count + 3.5 · 3) / (rating_count + 3)`: a
provider with zero reviews lands at the neutral prior (3.5/5), never
at zero — verified live (`provider_trust_score(null, null) = 3.5`). A
single 5-star review only pulls the score to 3.875, not straight to
5.0 (resistant to gaming via one review); 40 reviews averaging 4.6
lands at 4.52 (barely damped — real history dominates quickly, prior
weight is deliberately small). This directly satisfies "a new provider
should remain honestly represented" — `rating_count = 0` still renders
as "New provider · No reviews yet" everywhere it always has; the trust
score only affects *ranking*, never what's displayed.

**Tiering rule (not a weighted score).**
`job_match_tier(service_ratio, within_radius, schedule_available,
has_workload_conflict, machine_match, worker_match, budget_fit)`:
returns `null` if the service itself doesn't match (no ratio > 0);
otherwise counts how many of the six soft signals are explicitly
`false` (a `null` — unknown or not-applicable — never counts as
negative): 0 negatives → `'strong'`, 1 → `'good'`, 2+ → `'fair'`.
Verified live across all these cases with real data, including the
"unknowns don't count against you" case (a provider with zero
`provider_availability` rows got `schedule_available = null`, correctly
excluded from the tier calculation rather than counted as a miss).

**Hard eligibility vs. soft ranking.** Only three things exclude a
candidate entirely: job not in an open status
(`posted`/`matching`/`offers_received`, unchanged), the calling/
offering provider not being the authenticated owner of their own
profile (unchanged `owns_provider_profile` check), and — newly, a real
gap found and fixed this phase — a provider profile with
`is_active = false`. **`submit_job_offer()` never checked
`is_active`** before this phase; a deactivated provider (meant to be
invisible to farmers, per the profile's own "Visible to farmers while
active" copy) could still submit new offers. Fixed by adding the check
(migration 0033) and verified live: an inactive test provider's offer
attempt now fails with `"provider profile is not active"`, caught by
the existing generic error-mapping fallback in `submitOfferAction` so
nothing raw ever reaches the browser. Everything else — distance,
schedule, machine, worker, budget, reputation — is soft ranking only:
a candidate missing a resource still appears, just lower, per the
explicit "don't unfairly bury an imperfect match" product requirement.

**Distance and privacy.** No new coordinate exposure. Both RPCs already
withheld `farm_jobs.location`/`provider_profiles.location` themselves,
returning only a rounded `ST_Distance(...)/1000` and a free-text
`locality` (the farmer's own profile location string) — Phase 7 adds
no new column that could leak a raw coordinate, and every new helper
function operates entirely server-side inside the existing
`SECURITY DEFINER` boundary.

**Security regression, tested live with real accounts (not just code
review):** anonymous calls to `discover_jobs`/`get_offers_for_job` →
`401`; a farmer calling `discover_jobs` (no provider profile) →
empty array, no crash; an unrelated provider calling
`get_offers_for_job` on a job they don't own → `"not authorized"`;
direct `POST` to any of the eight new helper functions as an
authenticated user → `403 permission denied`; one provider reading
another provider's `machines`/`provider_availability` directly via
REST → empty result (existing owner-only RLS, unchanged, still
enforced); a forged/nonexistent `job_id` passed to `discover_jobs` →
empty result, not an error; all four pre-existing sort modes and all
four pre-existing filters re-verified working after the rewrite; full
farmer→provider lifecycle (post → discover with matching → offer →
compare with matching → accept → start → complete → review) re-run
end-to-end with no regression.

**Performance.** No new indexes were added. `EXPLAIN ANALYZE` on both
rewritten RPCs (warm cache) measured ~4ms each at prototype data
volumes — every new helper query is keyed by already-indexed columns
(`provider_id`, `job_id`) against small per-provider resource sets.
Performance advisor re-run clean (only the pre-existing `unused_index`
INFO-level noise expected on a low-traffic prototype). Per the explicit
instruction not to add speculative indexes, none were added
pre-emptively — if the provider/job count grows large enough to matter,
add `EXPLAIN`-justified indexes then, not now.

**UX.** `MatchTierBadge` (strong/good/fair, icon + label, never a
color-only signal) and `MatchFactList` (a ✓/✗ checklist, only showing
facts that are actually known — an unfilled or not-applicable signal
is silently omitted rather than shown as a false negative) are shared
components (`features/marketplace/components/match-badges.tsx`) reused
on the provider's Find Jobs cards, the farmer's desktop offer
comparison table (new "Match" column), and the mobile offer cards. No
percentage is ever shown — a bare "87%" is exactly the kind of false
precision this phase deliberately avoids in favor of a plain-language
checklist an investor can read at a glance.

**Known limitations, documented rather than hidden:**
- `provider_available_for_schedule` compares local time-of-day only —
  a job window that crosses midnight is not evaluated correctly.
- Machine-type matching is a normalized text comparison
  (`machine_type` is free text on both `machines` and
  `job_machine_requirements`, with no shared vocabulary) — a real but
  pragmatic approximation, not a guarantee. "Tractor" and "Farm
  Tractor" won't match today.
- Worker matching is pure capacity (headcount), never skill-matching.
- `machine_availability` (date-specific machine booking) remains fully
  dormant — the table and its exclusion constraint exist, but nothing
  writes to it anywhere in the codebase, and there is still no worker/
  machine-to-assignment junction table recording which specific
  machine or worker was actually sent on a confirmed job. Per-resource
  (as opposed to per-provider) availability is architecturally
  unreachable until that junction exists — explicitly deferred, not
  faked.
- `verification_status` has no real verification workflow behind it —
  nothing in the app ever sets a provider to `'verified'`. It remains
  a passive display fact and a small ranking bonus if true, not
  something this phase builds a process for.

**Deliberately deferred:** a materialized/cached match table (no
justification at current data volume — everything is computed live in
under 5ms); a farmer-selectable sort control on `get_offers_for_job`
(the fixed best-match-first order already answers "which provider is
the best fit" without added complexity); AI/ML-based matching or
personalization; push-based "notify matching providers about a new
job" (the existing pull/browse model via `discover_jobs` is
unchanged); skill-level worker matching; a machine-type taxonomy to
replace free-text comparison.

## Investor Demo Readiness Audit (Phase 8)

A production-grade audit of the existing product ahead of a live investor
demo — no new features (no payments, chat, AI matching, or admin
dashboards), just correctness, security, and polish on what Phase 3–7
already built.

**What was audited.** A full farmer + provider lifecycle walkthrough
through the real UI (not just API calls) with fresh test accounts:
landing → signup → onboarding → job posting → discovery/matching →
offer → comparison → acceptance → phone/location unlock → start →
complete → review → reputation update on both sides. Duplicate-email
signup, unauthorized direct navigation to protected routes while
logged out, and logout/back-button behavior were also exercised. A
real REST-level attack pass ran against the live Supabase project using
a separate, unrelated authenticated test account and the anon key
directly (bypassing the app entirely): anonymous/cross-account SELECTs
against `farm_jobs`, `profiles`, and `provider_profiles`, and forged-
parameter calls to `accept_job_offer`, `transition_job_status`,
`submit_review`, `submit_job_offer`, and `get_offers_for_job` against
resources the attacker didn't own. Every attack was correctly rejected
— RLS returned zero rows for direct table access, and every RPC raised
`not authorized`. `get_provider_reviews` and `discover_jobs`'s
`farmer_locality`/`distance_km` fields were confirmed to expose only
the intentionally public subset (no phone numbers, no raw coordinates)
consistent with the privacy model in "Trust & Reputation" (Phase 5) and
"Marketplace Intelligence & Matching" (Phase 7). The existing
`SECURITY DEFINER` advisor warnings (the RPCs listed throughout this
document) were reviewed again and confirmed intentional — no change.

**Fixes made.**
- **Signup, login, and forgot-password forms lost the typed email on
  every validation error** (wrong password, weak password, duplicate
  account, malformed email) — a React 19 behavior where a Server Action
  round-trip resets local component state on any submission, including
  `useState`-controlled inputs, not just uncontrolled fields (the
  onboarding form already worked around this narrower case in Phase 6).
  Fixed by extending `AuthFormState.values` to echo the submitted email
  back on every error path and resyncing it client-side
  (`src/features/auth/actions.ts`, `signup-form.tsx`, `login-form.tsx`,
  `forgot-password-form.tsx`). Passwords are never echoed back.
- **`/app/provider/profile` had no logout button and no path to
  `/app/profile`** — `PROVIDER_NAV` never links there, so a
  provider-only account had no UI-reachable way to log out or edit
  their shared name/phone/location. Added an "Account settings" card
  and a logout button to that page, always rendered regardless of
  onboarding state.
- **Redundant per-request work**: `createClient()` and
  `getCurrentProfile()` were called fresh (a real network round trip
  each time) in the layout and again in the page on nearly every route.
  Both are now wrapped in React's `cache()` so one request shares one
  result; `createClient` had to be cached too, since `getCurrentProfile`'s
  own cache only dedupes when it receives the same client instance.
  `/app/provider` also issued one `profiles` query per confirmed/
  in-progress assignment card instead of a single batched `.in()` query
  — fixed the same way.

**Not fixed, by design.** Leaked-password-protection (HaveIBeenPwned
checking) is off in Supabase Auth — a one-setting improvement, but a
dashboard/config change outside this audit's code scope; flagged for
the next phase, not silently skipped. The eleven "unused index"
advisories are expected at current data volume (a handful of demo
rows) and not evidence of a real query-plan problem — no action taken
per the standing rule of only adding/removing indexes when `EXPLAIN`
justifies it.

**Demo data.** No permanent seed data was created. The empty/near-
empty states already in the product (clean "No matching jobs nearby",
"New provider · No reviews yet", etc.) are honest and appropriate for
an early-stage demo; fabricating marketplace activity was explicitly
out of scope and would work against the "no fabricated traction"
requirement this audit was run under. If a rehearsed demo script is
wanted later, that's a product decision for the next phase, not
something this audit should have created unilaterally.

**Demo-readiness status:** ready for a live walkthrough of the core
farmer/provider loop described above. Known gaps for a next pass:
formal accessibility audit beyond the spot checks above, a wider
responsive sweep across every screen (only a sample was checked), and
the leaked-password-protection toggle.

## Final QA, Accessibility & Demo Hardening (Phase 9)

A closing QA pass addressing the specific gaps Phase 8 flagged as open:
responsive coverage was sampled rather than exhaustive, accessibility
was only lightly checked, leaked-password protection was unverified,
and neither concurrent offer acceptance nor concurrent lifecycle
transitions had been race-tested.

**Responsive sweep.** Every route Phase 8 listed as untested — all
marketing, auth, onboarding, farmer, and provider screens, plus the
provider profile's five tabs (Business/Services/Machines/Team/Hours)
— was checked at 375/768/1440px via `document.documentElement
.scrollWidth` vs `clientWidth` (not screenshots, which this session's
tooling can render at a misleading zoom level). Zero horizontal
overflow anywhere. No responsive fixes were needed.

**Accessibility audit.** A code-level review (Radix's own primitives —
Dialog, Tabs — are accessible by default and were only checked for
correct *usage*, not re-audited) found three real, fixable gaps, now
fixed:
- **No `<h1>` on `/login`, `/signup`, `/onboarding`, `/forgot-password`,
  `/reset-password`, `/auth/error`** — all six route through
  `AuthShell`, which rendered its page title as a `CardTitle` (a
  `<div>`), not a heading. `AuthShell` now renders a real `<h1>`.
- **No `aria-describedby` anywhere in the codebase** linking a field's
  visible validation error to the input it describes — `aria-invalid`
  told a screen reader a field was wrong, but never *why*. Fixed
  across all nine components using the `fieldErrors` pattern (login,
  signup, forgot-password, reset-password, and onboarding forms; the
  provider-profile, account-profile, and machine forms; the review
  form), each error `<p>` given a stable id and each input/checkbox
  group an `aria-describedby` pointing at it (or at a hint, where one
  exists, when there's no error).
- **Review form's comment `<Textarea>` had no label** — added a
  visually-hidden `<Label>` (the placeholder already conveys it
  visually).

Buttons-vs-links usage, Dialog titles, status-badge color+icon+text
pairing, and landmark (`<main>`) structure were all already clean —
confirmed, not touched.

**Supabase Auth: leaked-password protection.** Investigated whether
the connected Supabase MCP tooling (project/migration/SQL/advisor/
branch management — the same tools used throughout this document)
exposes this Auth setting. It does not — there is no
config-management tool in the connected toolset, and the setting is
not stored in a queryable `auth` schema table on hosted Supabase (it's
Management-API/Dashboard-only). No workaround was attempted, per
instruction. **This remains a manual step**: Dashboard → Authentication
→ Providers → Email → enable "Leaked password protection" (checks
against HaveIBeenPwned).

**Race-condition testing.** Ran real concurrent requests against the
live Supabase project (not simulated) — two simultaneous
`accept_job_offer` calls for competing offers on one job, and four
paired concurrent `transition_job_status` calls (start+start,
complete+complete, start+cancel, complete+cancel) — using separate
provider/farmer JWTs via direct REST calls. Every pair produced
exactly one winner and one clean rejection, with no partial or
inconsistent state:
- Offer acceptance: the loser failed with a `23505` unique-constraint
  violation on `job_assignments_single_active_per_job` (HTTP 409); the
  winner's own transaction atomically rejected the competing offer.
  Final state: exactly one `accepted` offer, one assignment, job
  `confirmed`, one notification.
- Lifecycle transitions: `transition_job_status` takes `select ... for
  update` on the job row before validating the transition, so a
  concurrent second call re-reads the already-updated row once the
  lock releases and correctly fails its own status check (`"job is
  not in a startable state"`, etc.) rather than racing past it.
  Confirmed for all four pairings.
- Also verified duplicate-submission protection on `submit_job_offer`
  (`job_offers_one_pending_per_provider_job` unique constraint) and
  `submit_review` ("you have already reviewed this job") the same way.

**No code changes were made here** — the existing row-locking and
unique-constraint design already handles this correctly, and per
instruction it wasn't weakened or "simplified" just to make a test
pass.

**Error handling.** Confirmed (both by reading `actions.ts` across
`jobs`, `provider`, and `reviews`, and by live-triggering them) that
every Postgres/RPC error a user could actually hit is caught and
translated to plain copy before reaching the UI — e.g. the
`job_assignments_single_active_per_job` constraint becomes "This job
already has an accepted provider," `not authorized` becomes "You're
not able to do that for this job." A nonexistent job id and a job the
current user isn't part of both render the same honest "Page not
found" (no data leak distinguishing "doesn't exist" from "not yours").
No raw Postgres errors, UUIDs, or stack traces found reaching the UI
anywhere checked.

**Double-click / repeated-submit audit.** Every mutating form already
disables its submit button via `disabled={isPending}` from
`useActionState` (this was true before this phase). The race-condition
testing above additionally confirms the *database* — not just the
button — is what actually prevents duplicate state under real
concurrency, which is the stronger guarantee. "Mark notification read"
is a plain idempotent `UPDATE ... SET read = true`, safe by
construction regardless of repeat clicks.

**Investor-demo happy path.** Ran one complete rehearsal with fresh
accounts through the real UI end to end: farmer signup → onboarding →
dashboard → post a job (through the full 7-step wizard) → publish;
provider signup → onboarding → profile → add a service → discover the
job (real "Strong match" scoring) → submit an offer; farmer gets a
notification, clicks through it, compares the offer, accepts it
(confirmation dialog, phone number unlocks); provider sees the exact
location unlock, starts the job, completes it; both sides leave a
review; provider's reputation updates to reflect it live on their own
profile. No bugs found in this run.

**Copy and demo-data review.** A separate investor-copy pass (landing,
farmer/provider marketing pages, auth, dashboards, empty states,
errors, match/verification/trust language) found nothing to change —
already through a polish pass in Phase 6, still holds: no fabricated
metrics, no "AI" claims, "Verified" gated strictly on
`verification_status`. Demo-data decision unchanged from Phase 8: no
permanent seed data created; the product's honest empty states ("No
matching jobs nearby," "New provider · No reviews yet") are the right
call for an early-stage demo.

**Code sweep.** No `console.log`, `TODO`/`FIXME`, stray test files, or
hardcoded secrets found; `.gitignore` correctly excludes `.env*` and
only `.env.example` is tracked. One dead file removed:
`src/components/ui/radio-group.tsx` (a shadcn-generated primitive that
was never imported anywhere).

**Test data.** Every test account and its jobs/offers/assignments/
reviews created during this phase's testing were deleted before
finishing — verified 0 rows remaining under each pattern used.

## Environment variables

All access goes through `src/lib/env.ts`, which throws a clear error if a
variable is missing rather than silently using `undefined`. Don't read
`process.env.*` directly outside that file.

- `.env.example` documents every variable and is committed.
- `.env.local` holds real values and is git-ignored. Copy the example to
  create it.
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser — only put
  values there that are safe to expose (Supabase URL, anon key). Secrets
  (service role key) must never carry that prefix.

## Error and loading conventions

- `src/app/loading.tsx` and `src/app/error.tsx` provide the app-wide
  fallback (skeleton / error boundary with retry). Next.js renders these
  automatically for the route tree.
- A feature route with meaningfully different loading or error UI adds its
  own `loading.tsx` / `error.tsx` inside that route segment — Next.js
  scopes them automatically, no wiring needed.
- `error.tsx` must be a Client Component (`"use client"`) — this is a
  Next.js requirement, not a project convention.

## UI components

- Reach for an existing `src/components/ui/*` primitive before writing a
  new one. Add more with `npx shadcn add <name>`.
- Feature-specific composite components (e.g. a job card) live in that
  feature's folder, built out of `components/ui` primitives.
- Mobile-first: design for the small viewport first, then add `md:`/`lg:`
  overrides. `/app/**` has its own bottom tab bar on mobile, owned by
  `AppShell` (`features/marketplace/components/app-shell.tsx`), and an
  inline header nav at the `md` breakpoint. The public marketing site
  uses a single nav mechanism instead — `SiteHeader`
  (`components/layout/site-header.tsx`), with its mobile menu in a
  `Sheet` — see "Investor-grade product polish" (Phase 6) for why a
  second, separate bottom tab bar was removed from those pages.

## Naming conventions

- Files/folders: `kebab-case` (`site-header.tsx`, `job-card.tsx`).
- Components: `PascalCase` export names, one primary component per file.
- Route folders under `src/app`: lowercase, matching the URL segment.
- Types/interfaces: `PascalCase`; prefer `type` over `interface` unless
  declaration merging is actually needed.

## Adding a new feature (future phases)

1. Create `src/features/<feature-name>/`.
2. Put feature UI, hooks, server actions, and feature-local types inside
   it.
3. Add routes under `src/app/<route>/` that import from the feature
   folder — keep `app/` files thin (composition + data fetching wiring),
   push logic into `features/`.
4. Add shared types to `src/types/` only once something outside the
   feature needs them.
5. If the feature needs new tables, add a migration (migrations directory
   to be established alongside the first schema change) and regenerate
   Supabase types rather than hand-writing them.

## Explicitly not decided yet

No matching algorithm — `discover_jobs`'s "Recommended" sort and every
other sort mode are plain, documented SQL ordering (see "Marketplace
discovery, filtering, and trust" above), never a score or an
ML-flavored ranking. No payments, no external notification channels
(SMS/WhatsApp/push/email — the notification system is in-app only, see
"Notifications" above), no review edit/dispute/moderation flow (reviews
are one-way once submitted — see "Trust & Reputation" above), no
worker/machine-to-assignment allocation, and no admin functionality.
Auth (Phase 2), the marketplace database foundation (Phase 3A), the
first farmer↔provider job loop (Phase 3B), the notification foundation
(Phase 3C), marketplace discovery/filtering/trust presentation
(Phase 3D), the confirmed→in_progress→completed/cancelled job lifecycle
(Phase 4), reviews and reputation (Phase 5), and a UX/UI polish pass
(Phase 6) exist — see the sections above. A provider cannot cancel a
confirmed/in-progress job (only the farmer can, by explicit design —
see "Job lifecycle"); no payment/commission step exists between a job
being priced (via the offer) and completed. These remaining items are
scoped to future phases and should not be anticipated speculatively in
this codebase.
