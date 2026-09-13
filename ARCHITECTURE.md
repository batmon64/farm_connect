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
  overrides. The app shell uses a bottom tab bar on mobile
  (`components/layout/mobile-tab-bar.tsx`) and an inline header nav at the
  `md` breakpoint (`components/layout/site-header.tsx`).

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
"Notifications" above), no reviews/rating-submission flow (ratings are
displayed from `provider_profiles` but nothing writes to them from the
app yet), no worker/machine-to-assignment allocation, and no admin
functionality. Auth (Phase 2), the marketplace database foundation
(Phase 3A), the first farmer↔provider job loop (Phase 3B), the
notification foundation (Phase 3C), marketplace discovery/filtering/
trust presentation (Phase 3D), and the confirmed→in_progress→completed/
cancelled job lifecycle (Phase 4) exist — see the sections above. A
provider cannot cancel a confirmed/in-progress job (only the farmer
can, by explicit design — see "Job lifecycle"); no payment/commission
step exists between a job being priced (via the offer) and completed.
These remaining items are scoped to future phases and should not be
anticipated speculatively in this codebase.
